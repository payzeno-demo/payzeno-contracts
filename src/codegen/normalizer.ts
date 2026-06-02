/**
 * `SourceModule` → `IrModule`.
 *
 * Where the TypeScript-shaped facts become language-neutral ones. Four rules do
 * most of the work:
 *
 *   1. `export const FOO = [...] as const` becomes an `IrEnum`. That idiom is
 *      the org's only enum, so anything else that looks like an enum isn't one.
 *   2. `foo?: T` is OPTIONAL. `foo: T | null` is NULLABLE. They are different
 *      facts and Pydantic spells them differently; collapsing them is how a
 *      required-but-nullable field turns into one the ledger can silently omit.
 *   3. `Paginated<T>` and `Record<K, V>` are the only generics.
 *   4. Anything else throws rather than guessing.
 */

import { UnsupportedTypeError } from './errors';
import type {
  IrConstMap,
  IrDeclaration,
  IrEnum,
  IrField,
  IrModel,
  IrModule,
  IrScalarName,
  IrType,
  SourceDeclaration,
  SourceMember,
  SourceModule,
  SourceTypeNode,
} from './ir';

/** Type aliases that are really scalars wearing a name. */
const SCALAR_ALIASES: Record<string, IrScalarName> = {
  IsoTimestamp: 'timestamp',
  IsoDate: 'date',
  MinorUnits: 'integer',
  BasisPoints: 'integer',
  string: 'string',
  number: 'number',
  boolean: 'boolean',
  unknown: 'unknown',
  // `EventEnvelope<TType, TPayload>`'s parameters. The loader does not model
  // type parameters, and erasing them here is what stops every generated
  // `*Event` alias referencing a name the target module never defines.
  TType: 'string',
  TPayload: 'unknown',
};

export class TypeNormalizer {
  private currentModule = '<unknown>';

  normalizeModule(m: SourceModule): IrModule {
    this.currentModule = m.moduleName;

    const declarations: IrDeclaration[] = [];
    for (const decl of m.declarations) {
      if (!decl.exported) {
        continue;
      }
      const normalized = this.normalizeDeclaration(decl);
      if (normalized !== null) {
        declarations.push(normalized);
      }
    }

    return { name: m.moduleName, sourcePath: m.filePath, declarations };
  }

  private normalizeDeclaration(decl: SourceDeclaration): IrDeclaration | null {
    switch (decl.kind) {
      case 'interface':
        return this.normalizeInterface(decl);
      case 'const-tuple':
        return this.normalizeConstTuple(decl);
      case 'alias':
        return this.normalizeAlias(decl);
      case 'const-record':
        return this.normalizeConstRecord(decl);
      default:
        return null;
    }
  }

  private normalizeInterface(decl: SourceDeclaration): IrModel {
    const fields: IrField[] = [];
    for (const member of decl.members ?? []) {
      fields.push(this.normalizeMember(member));
    }

    const base = decl.heritage !== undefined && decl.heritage.length > 0 ? decl.heritage[0] : null;

    return {
      kind: 'model',
      name: decl.name,
      fields,
      base: base ?? null,
      doc: decl.doc,
    };
  }

  private normalizeMember(member: SourceMember): IrField {
    const { type, nullable } = this.stripNull(member.type);
    return {
      name: member.name,
      type: this.normalizeTypeNode(type),
      optional: member.optional,
      nullable,
      doc: member.doc,
    };
  }

  /**
   * Pull `| null` out of a union and report it separately. Everything
   * downstream wants nullability as a flag, not as a union member — Python
   * spells it `| None` on the annotation and Java spells it `@Nullable`, and
   * neither can discover it by inspecting a union at render time.
   */
  private stripNull(node: SourceTypeNode): { type: SourceTypeNode; nullable: boolean } {
    if (node.kind !== 'union' || node.args === undefined) {
      return { type: node, nullable: false };
    }

    const nonNull = node.args.filter((arg) => arg.text.trim() !== 'null');
    if (nonNull.length === node.args.length) {
      return { type: node, nullable: false };
    }
    const first = nonNull[0];
    if (nonNull.length === 1 && first !== undefined) {
      return { type: first, nullable: true };
    }
    return { type: { ...node, args: nonNull }, nullable: true };
  }

  normalizeTypeNode(node: SourceTypeNode): IrType {
    switch (node.kind) {
      case 'keyword': {
        const scalar = SCALAR_ALIASES[node.text.trim()];
        if (scalar === undefined) {
          throw new UnsupportedTypeError(node.text, this.currentModule);
        }
        return { kind: 'scalar', name: scalar };
      }

      case 'literal':
        return { kind: 'literal', value: node.literal ?? node.text };

      case 'array': {
        const element = node.args?.[0];
        if (element === undefined) {
          throw new UnsupportedTypeError(node.text, this.currentModule);
        }
        return { kind: 'generic', name: 'Array', args: [this.normalizeTypeNode(element)] };
      }

      case 'union': {
        const members = (node.args ?? []).map((arg) => this.normalizeTypeNode(arg));
        if (members.length === 0) {
          throw new UnsupportedTypeError(node.text, this.currentModule);
        }
        return { kind: 'union', members };
      }

      case 'reference': {
        const name = node.typeName ?? node.text;
        const scalar = SCALAR_ALIASES[name];
        if (scalar !== undefined) {
          return { kind: 'scalar', name: scalar };
        }
        // Every `*Id` alias is a prefixed ULID string. Emitting a distinct
        // NewType per id in Python was tried and rejected: it made every
        // ledger call site cast.
        if (/Id$/.test(name)) {
          return { kind: 'scalar', name: 'string' };
        }
        return { kind: 'ref', name };
      }

      case 'generic':
        return this.normalizeGeneric(node);

      case 'object': {
        // Inline object types (ApiError.error) are flattened to an opaque
        // mapping. Naming them would invent a symbol that has no TypeScript
        // counterpart and the parity check would then fail on it.
        return {
          kind: 'generic',
          name: 'Record',
          args: [
            { kind: 'scalar', name: 'string' },
            { kind: 'scalar', name: 'unknown' },
          ],
        };
      }

      case 'indexed':
        // `(typeof FOO)[number]` — the derived-union idiom. The tuple it
        // derives from is already an IrEnum, so point at that.
        return this.normalizeIndexed(node);

      default:
        throw new UnsupportedTypeError(node.text, this.currentModule);
    }
  }

  // TODO(PAY-1902): only Paginated<T> and Record<K,V> are normalised. Anything
  // else throws. Add when someone actually needs one.
  private normalizeGeneric(node: SourceTypeNode): IrType {
    const name = node.typeName ?? '';
    const args = (node.args ?? []).map((arg) => this.normalizeTypeNode(arg));

    if (name === 'Paginated' && args.length === 1) {
      return { kind: 'generic', name: 'Paginated', args };
    }
    if (name === 'Record' && args.length === 2) {
      return { kind: 'generic', name: 'Record', args };
    }
    if (name === 'Array' && args.length === 1) {
      return { kind: 'generic', name: 'Array', args };
    }
    // Every `*Event` alias is `EventEnvelope<'type', Payload>`. The targets
    // erase the parameters and carry `type: str` / `payload: Any`, which is
    // exactly what a consumer that switches on `(type, version)` needs.
    if (name === 'EventEnvelope' && args.length === 2) {
      return { kind: 'generic', name: 'EventEnvelope', args };
    }

    throw new UnsupportedTypeError(node.text, this.currentModule);
  }

  private normalizeIndexed(node: SourceTypeNode): IrType {
    const match = /typeof\s+([A-Za-z0-9_]+)/.exec(node.text);
    const tupleName = match?.[1];
    if (tupleName === undefined) {
      throw new UnsupportedTypeError(node.text, this.currentModule);
    }
    return { kind: 'ref', name: tupleName };
  }

  private normalizeConstTuple(decl: SourceDeclaration): IrEnum {
    return {
      kind: 'enum',
      name: decl.name,
      values: decl.values ?? [],
      doc: decl.doc,
    };
  }

  private normalizeAlias(decl: SourceDeclaration): IrDeclaration | null {
    if (decl.aliasType === undefined) {
      return null;
    }
    // `export type CurrencyCode = (typeof CURRENCIES)[number]` becomes a real
    // alias pointing at the tuple's Literal. Dropping it was tried first and
    // every field typed `CurrencyCode` then referenced a name the generated
    // module did not define.
    const { type, nullable } = this.stripNull(decl.aliasType);

    let target: IrType;
    try {
      target = this.normalizeTypeNode(type);
    } catch (error) {
      // A generic helper alias (`EventHandler<T>`, `EventOfType<T>`) has no
      // target-language counterpart. Dropping it is correct; the parity
      // exemption list in parity.ts is what keeps that honest rather than
      // silent.
      if (error instanceof UnsupportedTypeError) {
        return null;
      }
      throw error;
    }

    return {
      kind: 'alias',
      name: decl.name,
      target: nullable ? { kind: 'union', members: [target] } : target,
      doc: decl.doc,
    };
  }
}
