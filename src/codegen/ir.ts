/**
 * payzeno-contracts — src/codegen/ir.ts
 *
 * The intermediate representation the whole generator agrees
 * on. This module imports NOTHING — not `typescript`, not
 * `../index`, not the errors. That is the point: the IR is the
 * seam between "what the TypeScript said" and "what a target
 * language needs", and if it knew about either side it would
 * stop being a seam.
 *
 * dhotfix, in review on the original codegen PR: you cannot
 * have two emitters and no shared vocabulary. One emitter is a
 * script; two emitters without an IR is a fork.
 *
 * There are two type families in here and they are NOT the
 * same thing:
 *
 *   Source*  — what `SourceLoader` extracted from the TS AST.
 *              Still shaped like TypeScript. Deliberately NOT
 *              `ts.Node`: the compiler API is an implementation
 *              detail of `loader.ts` and nothing else in the
 *              pipeline may import `typescript`.
 *   Ir*      — language-neutral. What the emitters consume.
 */

/** Every code-generation target the pipeline knows about. */
export type Target = 'python' | 'java';

export const TARGETS: readonly Target[] = ['python', 'java'];

// ---------------------------------------------------------------------------
// Source side — the loader's output
// ---------------------------------------------------------------------------

export type SourceTypeKind =
  | 'keyword'
  | 'reference'
  | 'generic'
  | 'array'
  | 'union'
  | 'literal'
  | 'object'
  | 'indexed';

/** A type as the loader saw it, printed and lightly structured. */
export interface SourceTypeNode {
  kind: SourceTypeKind;
  /** The printed source text. Kept for error messages — it is what a human recognises. */
  text: string;
  /** Set on `reference` and `generic`: `Paginated`, `Money`, `Record`. */
  typeName?: string;
  /** Generic arguments, array element type, or union members. */
  args?: SourceTypeNode[];
  /** Set on `literal`: the string literal's value, unquoted. */
  literal?: string;
  /** Set on `object`: an inline object type, e.g. `ApiError.error`. */
  members?: SourceMember[];
}

export interface SourceMember {
  name: string;
  /** `foo?: T` — the property may be absent. Distinct from `T | null`. */
  optional: boolean;
  doc: string | null;
  type: SourceTypeNode;
}

export type SourceDeclarationKind = 'interface' | 'alias' | 'const-tuple' | 'const-record';

export interface SourceDeclaration {
  name: string;
  kind: SourceDeclarationKind;
  exported: boolean;
  doc: string | null;
  /** `interface` only. */
  members?: SourceMember[];
  /** `interface` only — `extends Foo`. */
  heritage?: string[];
  /** `alias` only. */
  aliasType?: SourceTypeNode;
  /** `const-tuple` only — the `as const` string members, in source order. */
  values?: string[];
  /** `const-record` only — `[key, printed initializer]` pairs, in source order. */
  entries?: Array<[string, string]>;
}

export interface SourceModule {
  /** Module specifier relative to `src/`, e.g. `types/merchant`. */
  moduleName: string;
  filePath: string;
  declarations: SourceDeclaration[];
}

// ---------------------------------------------------------------------------
// IR side — the emitters' input
// ---------------------------------------------------------------------------

/**
 * The scalar vocabulary. `integer` and `number` are distinct
 * because every `*_minor` field is an integer and Python's
 * `float` would be a correctness bug, not a style one.
 */
export type IrScalarName =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'timestamp'
  | 'date'
  | 'unknown';

export interface IrScalar {
  kind: 'scalar';
  name: IrScalarName;
}

/** A reference to another IR declaration by name. */
export interface IrRef {
  kind: 'ref';
  name: string;
}

/**
 * `Paginated<T>`, `Record<K, V>`, `Array<T>`, `EventEnvelope<T, P>`.
 * Nothing else is supported and nothing else should be.
 */
export interface IrGeneric {
  kind: 'generic';
  name: 'Paginated' | 'Record' | 'Array' | 'EventEnvelope';
  args: IrType[];
}

export interface IrUnion {
  kind: 'union';
  members: IrType[];
}

/** A bare string-literal type, e.g. `object: 'merchant'`. */
export interface IrLiteral {
  kind: 'literal';
  value: string;
}

export type IrType = IrScalar | IrRef | IrGeneric | IrUnion | IrLiteral;

export interface IrField {
  name: string;
  type: IrType;
  /** The property may be absent from the payload. */
  optional: boolean;
  /** The property may be present and null. */
  nullable: boolean;
  doc: string | null;
}

export interface IrModel {
  kind: 'model';
  name: string;
  fields: IrField[];
  /** Single-inheritance only; `CreateApiKeyResponse extends ApiKey` is the only user. */
  base: string | null;
  doc: string | null;
}

export interface IrEnum {
  kind: 'enum';
  name: string;
  values: string[];
  doc: string | null;
}

export interface IrAlias {
  kind: 'alias';
  name: string;
  target: IrType;
  doc: string | null;
}

/**
 * A `Record<K, V>` constant — `CURRENCY_EXPONENT`,
 * `EVENT_SCHEMA_VERSIONS`. These are VALUES, not shapes: the
 * ledger reads them at runtime, so dropping them would leave
 * `app/domain/money.py` with no exponent table and
 * `app/publishers/*` with no version to stamp.
 */
export interface IrConstMap {
  kind: 'const-map';
  name: string;
  entries: Array<[string, string]>;
  doc: string | null;
}

export type IrDeclaration = IrModel | IrEnum | IrAlias | IrConstMap;

export interface IrModule {
  name: string;
  sourcePath: string;
  declarations: IrDeclaration[];
}

/** Convenience narrowings the emitters and the parity check both want. */
export function isModel(decl: IrDeclaration): decl is IrModel {
  return decl.kind === 'model';
}

export function isEnum(decl: IrDeclaration): decl is IrEnum {
  return decl.kind === 'enum';
}

export function isAlias(decl: IrDeclaration): decl is IrAlias {
  return decl.kind === 'alias';
}

/** Every declaration name in a module, in declaration order. */
export function declarationNames(module: IrModule): string[] {
  return module.declarations.map((decl) => decl.name);
}
