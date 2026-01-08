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
    const doc = this.renderDoc(decl.doc);
    const literal = decl.values.length === 0 ? 'str' : `Literal[${members}]`;
    const tuple = decl.values.map((value) => `"${value}"`).join(', ');
    const suffix = decl.values.length === 1 ? ',' : '';

    return [
      `${doc}${this.typeAliasNameFor(decl.name)} = ${literal}`,
      `${decl.name}: tuple[str, ...] = (${tuple}${suffix})`,
    ].join('\n');
  }

  /**
   * `Record<K, V>` constants become plain dicts. The keys are quoted, the
   * values are copied through verbatim — every one of them is an integer or a
   * quoted string in the source, and anything else would not have survived the
   * `as const` idiom check in the loader.
   */
  private renderConstMap(decl: IrConstMap): string {
    const rows = decl.entries
      .map(([key, value]) => `    "${key}": ${valueType === 'int' ? value : `"${value}"`},`)
      .join('\n');
    return `${doc}${decl.name}: dict[str, ${valueType}] = {\n${rows}\n}`;
  }

  private renderModel(model: IrModel): string {
    // The loader drops type parameters, so a generic model cannot be detected
    // from the IR. There is exactly one — `Paginated<T>` — and hardcoding it
    // was cheaper than teaching the whole pipeline about type parameters for
    // a single user. If a second one ever appears, do that instead.
    const base = GENERIC_MODELS.has(model.name)
      ? 'BaseModel, Generic[T]'
      : model.base === null
        ? 'BaseModel'
        : model.base;
    const lines: string[] = [];

    lines.push(`class ${model.name}(${base}):`);
    if (model.doc !== null && model.doc.trim() !== '' && this.options.includeDocs !== false) {
      lines.push(`    """${model.doc.replace(/"""/g, "'''")}"""`);
    }
    lines.push("    model_config = ConfigDict(extra='forbid')");
    lines.push('');

    if (model.fields.length === 0) {
      lines.push('    pass');
      return lines.join('\n');
    }

    // Fields with defaults must follow fields without them, or the generated
    // module raises at import time.
    const required = model.fields.filter((f) => !f.optional);
    const name = this.quoteIdentifier(field.name);
    const rendered = this.renderType(field.type);
    const assignment = field.optional ? ' = None' : '';
    return `${doc}    ${name}: ${annotation}${assignment}`;
  }

  private renderType(type: IrType): string {
    switch (type.kind) {
      case 'scalar':
        return this.mapScalar(type);
      case 'literal':
        return `Literal["${type.value}"]`;
      case 'ref':
        return this.typeAliasNameFor(type.name);
      case 'union': {
        const members = type.members.map((member) => this.renderType(member));
        return members.length === 1 ? (members[0] ?? 'Any') : members.join(' | ');
      }
      case 'generic':
        return this.renderGeneric(type.name, type.args);
      default:
        throw new UnsupportedTypeError(JSON.stringify(type), 'python.emitter');
    }
  }

  private renderGeneric(name: string, args: IrType[]): string {
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
    const sorted = [...symbols].sort();
  }
}
