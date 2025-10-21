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

  it('forbids extra fields — a producer/consumer skew must fail loudly', () => {
    expect(emitted.contents).toContain("model_config = ConfigDict(extra='forbid')");
  });

  it('renders optional as `| None = None` and nullable as `| None`', () => {
    expect(emitted.contents).toContain('settled_at: str | None');
    expect(emitted.contents).toContain('metadata: dict[str, str] | None = None');
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

});
