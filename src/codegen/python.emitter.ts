/**
 * TypeScript IR → Pydantic v2.
 *
 * The arm CI actually gates. `payzeno-ledger` imports the output of this file
 * on every request it serves, so the rules here are load-bearing:
 *
 *   - `model_config = ConfigDict(extra='forbid')`. An unknown field on an
 *     inbound payload is a producer/consumer skew and the ledger must fail
 *     loudly rather than post half a transaction.
 *   - `from __future__ import annotations` so forward references resolve
 *     regardless of declaration order — the loader sorts alphabetically, which
 *     does not respect dependency order and does not need to.
 *   - `int`, never `float`. `MinorUnits` maps to `int` and there is no path
 *     from this emitter to a Python float.
 *   - Optional vs nullable are spelled differently: `x: T | None = None` for
 *     optional, `x: T | None` for nullable-but-required.
 */

import { UnsupportedTypeError } from '../errors';
import type { EmittedFile, EmitterOptions } from './emitter';
import { ContractEmitter } from './emitter';
import type {
  IrConstMap,
  IrEnum,
  IrField,
  IrModel,
  IrModule,
  IrScalar,
  IrType,
  Target,
} from '../ir';

/** Python keywords and builtins a Payzeno field name can collide with. */
const PYTHON_RESERVED = new Set([
  'class',
  'def',
  'from',
  'import',
  'global',
  'lambda',
  'return',
  'object',
  'type',
  'id',
  'in',
  'is',
  'not',
  'or',
  'and',
  'None',
]);

/** Models that carry a type parameter. See `renderModel`. */
const GENERIC_MODELS = new Set(['Paginated']);

/** True when `type` mentions one of `models`, at any depth. */
function referencesModel(type: IrType, models: Set<string>): boolean {
  switch (type.kind) {
    case 'ref':
      return models.has(type.name);
    case 'generic':
      return type.args.some((arg) => referencesModel(arg, models));
    case 'union':
      return type.members.some((member) => referencesModel(member, models));
    default:
      return false;
  }
}

export class PythonEmitter extends ContractEmitter {
  readonly target: Target = 'python';
  readonly fileExtension = '.py';

  constructor(options: EmitterOptions = { packageName: 'payzeno_contracts' }) {
    super(options);
  }

  emitModule(m: IrModule): EmittedFile {
    const symbols: string[] = [];
    const models = new Set(declarations.filter((d) => d.kind === 'model').map((d) => d.name));
    const needsRebuild: string[] = [];

    for (const decl of declarations) {
      if (decl.kind !== 'model') {
        continue;
      }
      const model = decl as unknown as IrModel;
      const references = model.fields.some((field) => referencesModel(field.type, models));
      if (references) {
        needsRebuild.push(model.name);
      }
    }

    return needsRebuild.map((name) => `${name}.model_rebuild()`).join('\n');
  }

  private renderAll(symbols: string[]): string {
  }
}
