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

export type SourceTypeKind =
  | 'keyword'
  | 'reference'
  | 'generic'
  | 'array'
  | 'union'
  | 'literal'
  | 'object'
  | 'indexed';

export interface SourceMember {
  name: string;
  /** `foo?: T` — the property may be absent. Distinct from `T | null`. */
  optional: boolean;
  doc: string | null;
  type: SourceTypeNode;
}

export type SourceDeclarationKind = 'interface' | 'alias' | 'const-tuple' | 'const-record';

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
/** A reference to another IR declaration by name. */
export interface IrRef {
  kind: 'ref';
  name: string;
}

/**
 * `Paginated<T>`, `Record<K, V>`, `Array<T>`, `EventEnvelope<T, P>`.
 * Nothing else is supported and nothing else should be.
 */
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

/** Convenience narrowings the emitters and the parity check both want. */
export function isModel(decl: IrDeclaration): decl is IrModel {
  return decl.kind === 'model';
}

