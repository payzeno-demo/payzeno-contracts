import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { parseArgs } from './cli';
import { EmitDriftError, UnsupportedTypeError } from './errors';
import { PythonEmitter } from './emitters/python.emitter';
import { JavaEmitter } from './emitters/java.emitter';
import type { IrModule } from './ir';
import { TypeNormalizer } from './normalizer';
import type { SourceModule } from './ir';
import { DeterministicWriter } from './writer';

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'payzeno-codegen-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

const sourceModule: SourceModule = {
  moduleName: 'types/sample',
  filePath: 'src/types/sample.ts',
  declarations: [
    {
      name: 'CHARGE_STATUSES',
      kind: 'const-tuple',
      exported: true,
      doc: null,
      values: ['pending', 'authorized', 'captured'],
    },
    {
      name: 'SampleCharge',
      kind: 'interface',
      exported: true,
      doc: 'A charge, trimmed to what the emitter needs to prove.',
      heritage: [],
      members: [
        {
          name: 'id',
          optional: false,
          doc: null,
          type: { kind: 'reference', text: 'ChargeId', typeName: 'ChargeId' },
        },
        {
          name: 'object',
          optional: false,
          doc: null,
          type: { kind: 'literal', text: "'charge'", literal: 'charge' },
        },
        {
          name: 'amount_minor',
          optional: false,
          doc: null,
          type: { kind: 'reference', text: 'MinorUnits', typeName: 'MinorUnits' },
        },
        {
          name: 'settled_at',
          optional: false,
          doc: null,
          type: {
            kind: 'union',
            text: 'IsoTimestamp | null',
            args: [
              { kind: 'reference', text: 'IsoTimestamp', typeName: 'IsoTimestamp' },
              { kind: 'keyword', text: 'null' },
            ],
          },
        },
        {
          name: 'metadata',
          optional: true,
          doc: null,
          type: {
            kind: 'generic',
            text: 'Record<string, string>',
            typeName: 'Record',
            args: [
              { kind: 'keyword', text: 'string' },
              { kind: 'keyword', text: 'string' },
            ],
          },
        },
      ],
    },
  ],
};

function normalize(): IrModule {
  return new TypeNormalizer().normalizeModule(sourceModule);
}

describe('TypeNormalizer', () => {
  it('turns an `as const` tuple into an IrEnum', () => {
    const module = normalize();
    const enumDecl = module.declarations.find((d) => d.name === 'CHARGE_STATUSES');
    expect(enumDecl?.kind).toBe('enum');
    if (enumDecl?.kind === 'enum') {
      expect(enumDecl.values).toEqual(['pending', 'authorized', 'captured']);
    }
  });

  it('separates optional from nullable', () => {
    const module = normalize();
    const model = module.declarations.find((d) => d.name === 'SampleCharge');
    expect(model?.kind).toBe('model');
    if (model?.kind === 'model') {
      const settled = model.fields.find((f) => f.name === 'settled_at');
      expect(settled?.nullable).toBe(true);
      expect(settled?.optional).toBe(false);

      const metadata = model.fields.find((f) => f.name === 'metadata');
      expect(metadata?.optional).toBe(true);
      expect(metadata?.nullable).toBe(false);
    }
  });

  it('maps MinorUnits to an integer scalar, never a float', () => {
    const module = normalize();
    const model = module.declarations.find((d) => d.name === 'SampleCharge');
    if (model?.kind === 'model') {
      const amount = model.fields.find((f) => f.name === 'amount_minor');
      expect(amount?.type).toEqual({ kind: 'scalar', name: 'integer' });
    }
  });

  it('throws UnsupportedTypeError on an un-normalisable generic', () => {
    const normalizer = new TypeNormalizer();
    expect(() =>
      normalizer.normalizeTypeNode({
        kind: 'generic',
        text: 'Promise<string>',
        typeName: 'Promise',
        args: [{ kind: 'keyword', text: 'string' }],
      }),
    ).toThrow(UnsupportedTypeError);
  });

  it('throws UnsupportedTypeError on an unknown keyword', () => {
    const normalizer = new TypeNormalizer();
    expect(() => normalizer.normalizeTypeNode({ kind: 'keyword', text: 'symbol' })).toThrow(
      UnsupportedTypeError,
    );
  });
});

describe('PythonEmitter', () => {
  const emitted = new PythonEmitter().emitModule(normalize());

  it('emits a .py file named after the module', () => {
    expect(emitted.path).toBe('sample.py');
  });

  it('forbids extra fields — a producer/consumer skew must fail loudly', () => {
    expect(emitted.contents).toContain("model_config = ConfigDict(extra='forbid'");
  });

  it('imports future annotations so declaration order does not matter', () => {
    expect(emitted.contents).toContain('from __future__ import annotations');
  });

  it('renders the tuple as a Literal alias plus the tuple itself', () => {
    expect(emitted.contents).toContain('CHARGE_STATUSES_VALUES = Literal[');
    expect(emitted.contents).toContain('CHARGE_STATUSES: tuple[str, ...] = (');
  });

  it('renders optional as `| None = None` and nullable as `| None`', () => {
    expect(emitted.contents).toContain('settled_at: str | None');
    expect(emitted.contents).toContain('metadata: dict[str, str] | None = None');
  });

  it('renders money as int', () => {
    expect(emitted.contents).toContain('amount_minor: int');
    expect(emitted.contents).not.toContain('float');
  });

  it('escapes the `object` field name, which is a Python builtin', () => {
    expect(emitted.contents).toContain('object_: Literal["charge"]');
  });

  it('keeps the wire name of an escaped field as its alias', () => {
    expect(emitted.contents).toContain(`object_: Literal["charge"] = Field(alias='object')`);
    expect(emitted.contents).toContain("ConfigDict(extra='forbid', populate_by_name=True)");
    expect(emitted.contents).toContain('from pydantic import BaseModel, ConfigDict, Field');
  });

  it('stamps the DO-NOT-EDIT banner with CONTRACTS_VERSION', () => {
    expect(emitted.contents).toContain('DO NOT EDIT');
    expect(emitted.contents).toMatch(/CONTRACTS_VERSION \d+\.\d+\.\d+/);
  });

  it('exports every symbol in __all__', () => {
    expect(emitted.contents).toContain('__all__ = [');
    expect(emitted.symbols.sort()).toEqual(['CHARGE_STATUSES', 'SampleCharge']);
  });
});

describe('JavaEmitter', () => {
  const module = normalize();
  // The derived-union alias is what names the Java enum. The TS half of that
  // pair lives in a different declaration, so hand it to the emitter here.
  module.declarations.push({
    kind: 'alias',
    name: 'ChargeStatus',
    target: { kind: 'ref', name: 'CHARGE_STATUSES' },
    doc: null,
  });
  const files = new JavaEmitter().emitAll(module);

  it('names the enum after the derived union, not the tuple', () => {
    expect(files.map((f) => path.basename(f.path)).sort()).toEqual([
      'ChargeStatus.java',
      'SampleCharge.java',
    ]);
  });

  it('emits records with long for money', () => {
    const record = files.find((f) => f.path.endsWith('SampleCharge.java'));
    expect(record?.contents).toContain('public record SampleCharge(');
    expect(record?.contents).toContain('long amount_minor');
  });

  it('emits a value-carrying enum with fromValue', () => {
    const enumFile = files.find((f) => f.path.endsWith('ChargeStatus.java'));
    expect(enumFile?.contents).toContain('PENDING("pending")');
    expect(enumFile?.contents).toContain('public static ChargeStatus fromValue(String raw)');
  });
});

describe('DeterministicWriter', () => {
  it('is byte-stable across two runs', () => {
    const dir = tempDir();
    const writer = new DeterministicWriter();
    const files = [new PythonEmitter().emitModule(normalize())];

    const first = writer.writeAll(files, dir, 'write');
    expect(first.written).toEqual(['sample.py']);

    const second = writer.writeAll(files, dir, 'write');
    expect(second.written).toEqual([]);
    expect(second.unchanged).toEqual(['sample.py']);
  });

  it('normalises CRLF and the trailing newline', () => {
    const dir = tempDir();
    const writer = new DeterministicWriter();
    writer.writeAll(
      [{ path: 'x.py', contents: 'a = 1\r\nb = 2   \n\n\n', symbols: [] }],
      dir,
      'write',
    );
    expect(fs.readFileSync(path.join(dir, 'x.py'), 'utf8')).toBe('a = 1\nb = 2\n');
  });

  it('throws EmitDriftError in check mode when the tree is stale', () => {
    const dir = tempDir();
    const writer = new DeterministicWriter();
    const file = { path: 'x.py', contents: 'a = 1\n', symbols: [] };
    writer.writeAll([file], dir, 'write');

    expect(() =>
      writer.writeAll([{ ...file, contents: 'a = 2\n' }], dir, 'check'),
    ).toThrow(EmitDriftError);
  });

  it('does not write in check mode', () => {
    const dir = tempDir();
    const writer = new DeterministicWriter();
    expect(() =>
      writer.writeAll([{ path: 'x.py', contents: 'a = 1\n', symbols: [] }], dir, 'check'),
    ).toThrow(EmitDriftError);
    expect(fs.existsSync(path.join(dir, 'x.py'))).toBe(false);
  });
});

describe('cli.parseArgs', () => {
  it('parses target, out and check', () => {
    expect(parseArgs(['--target', 'python', '--out', 'python', '--check'])).toEqual({
      target: 'python',
      outDir: 'python',
      check: true,
    });
  });

  it('rejects an unknown target', () => {
    expect(() => parseArgs(['--target', 'rust', '--out', 'rust'])).toThrow(RangeError);
  });

  it('requires both flags', () => {
    expect(() => parseArgs(['--out', 'python'])).toThrow(RangeError);
    expect(() => parseArgs(['--target', 'python'])).toThrow(RangeError);
  });
});
