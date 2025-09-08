/**
 * TypeScript IR → Java 17 records.
 *
 * Half-finished, and honest about it. Written in one afternoon in month 2 so
 * that payzeno-billing-legacy could stop hand-maintaining its copy of
 * `ApiError`, and not touched since.
 *
 * What it does NOT do, in rough order of how much it matters:
 *   - unions collapse to `Object`. Java has no union type and sealed
 *     interfaces would need a name per member, which needs a naming rule
 *     nobody has agreed on.
 *   - no `@JsonProperty`; it relies on the Jackson snake_case naming strategy
 *     being configured in the consumer. It is, in
 *     `com.payzeno.billing.config.JacksonConfig`, but nothing here checks.
 *   - generics on `Paginated<T>` are emitted but not tested.
 *   - no nullability annotations at all.
 *
 * And the reason it drifts: `codegen:java` is a MANUAL run. CI gates
 * `codegen:python` with `git diff --exit-code` and never invokes this file, so
 * the committed `java/` tree is exactly as fresh as the last time somebody
 * remembered. At time of writing it is a minor version behind. PAY-1996.
 */

import { UnsupportedTypeError } from '../errors';
import type { EmittedFile, EmitterOptions } from './emitter';
import { ContractEmitter } from './emitter';
import type { IrEnum, IrField, IrModel, IrModule, IrScalar, IrType, Target } from '../ir';

const JAVA_RESERVED = new Set([
  'abstract',
  'class',
  'default',
  'enum',
  'final',
  'import',
  'interface',
  'native',
  'new',
  'package',
  'private',
  'public',
  'record',
  'return',
  'static',
  'switch',
  'this',
  'void',
]);

export class JavaEmitter extends ContractEmitter {
  readonly target: Target = 'java';
  readonly fileExtension = '.java';

  constructor(options: EmitterOptions = { packageName: 'com.payzeno.contracts' }) {
    super(options);
  }

  protected override commentPrefix(): string {
    return '//';
  }

  /**
   * One Java file per DECLARATION, not per module — Java requires the public
   * type to match the file name. `emitModule` therefore returns the first
   * declaration's file and the pipeline calls `emitAll` for the rest.
   */
  emitModule(m: IrModule): EmittedFile {
    const files = this.emitAll(m);
    const first = files[0];
    if (first === undefined) {
      return {
        path: `${this.packagePath()}/package-info.java`,
        contents: `${this.header()}\npackage ${this.options.packageName};\n`,
        symbols: [],
      };
    }
    return first;
  }

  /**
   * Every file this module produces. The pipeline uses this one.
   *
   * Java names its enum after the DERIVED UNION, not after the tuple:
   * `INVOICE_STATUSES` / `InvoiceStatus` are one concept in TypeScript and one
   * type over here, and `InvoiceStatuses` would be a name no consumer expects.
   * So the tuples are indexed, and each alias that points at one becomes the
   * enum.
   */
  emitAll(m: IrModule): EmittedFile[] {
    const tuples = new Map<string, IrEnum>();
    for (const decl of m.declarations) {
      if (decl.kind === 'enum') {
        tuples.set(decl.name, decl);
      }
    }

    const files: EmittedFile[] = [];
    for (const decl of m.declarations) {
      if (decl.kind === 'model') {
        files.push(this.renderRecord(decl));
        continue;
      }
      if (decl.kind === 'alias' && decl.target.kind === 'ref') {
        const tuple = tuples.get(decl.target.name);
        if (tuple !== undefined) {
          files.push(this.renderEnum(decl.name, tuple));
        }
      }
      // Everything else has no Java counterpart. `type MerchantId = string` is
      // just String over here, and a union is Object. Dropping them is one of
      // the reasons the parity check runs on the python arm only.
    }
    return files;
  }

  private renderRecord(model: IrModel): EmittedFile {
    const components = model.fields
      .map((field) => `    ${this.renderComponent(field)}`)
      .join(',\n');

    const contents = [
      this.header(),
      '',
      `package ${this.options.packageName};`,
      '',
      'import java.util.List;',
      'import java.util.Map;',
      '',
      `public record ${model.name}(`,
      components,
      ') {}',
      '',
    ].join('\n');

    return {
      path: `${this.packagePath()}/${model.name}.java`,
      contents,
      symbols: [model.name],
    };
  }

  private renderComponent(field: IrField): string {
    return `${this.renderType(field.type)} ${this.quoteIdentifier(field.name)}`;
  }

  private renderEnum(name: string, tuple: IrEnum): EmittedFile {
    const constants = tuple.values
      .map((value) => `    ${this.constantNameFor(value)}("${value}")`)
      .join(',\n');

    const contents = [
      this.header(),
      '',
      `package ${this.options.packageName};`,
      '',
      `public enum ${name} {`,
      `${constants};`,
      '',
      '    private final String value;',
      '',
      `    ${name}(String value) {`,
      '        this.value = value;',
      '    }',
      '',
      '    public String value() {',
      '        return value;',
      '    }',
      '',
      `    public static ${name} fromValue(String raw) {`,
      `        for (${name} candidate : values()) {`,
      '            if (candidate.value.equals(raw)) {',
      '                return candidate;',
      '            }',
      '        }',
      '        throw new IllegalArgumentException("unknown value: " + raw);',
      '    }',
      '}',
      '',
    ].join('\n');

    return {
      path: `${this.packagePath()}/${name}.java`,
      contents,
      symbols: [name],
    };
  }

  private renderType(type: IrType): string {
    switch (type.kind) {
      case 'scalar':
        return this.mapScalar(type);
      case 'literal':
        return 'String';
      case 'ref':
        return type.name;
      case 'union':
        // TODO: sealed interfaces. Until then a union is an Object and
        // Jackson figures it out at runtime, which it does not always do.
        return 'Object';
      case 'generic':
        return this.renderGeneric(type.name, type.args);
      default:
        throw new UnsupportedTypeError(JSON.stringify(type), 'java.emitter');
    }
  }

  private renderGeneric(name: string, args: IrType[]): string {
    const rendered = args.map((arg) => this.boxed(this.renderType(arg)));
    switch (name) {
      case 'Array':
        return `List<${rendered[0] ?? 'Object'}>`;
      case 'Record':
        return `Map<${rendered[0] ?? 'String'}, ${rendered[1] ?? 'Object'}>`;
      case 'Paginated':
        return `Paginated<${rendered[0] ?? 'Object'}>`;
      case 'EventEnvelope':
        return 'EventEnvelope';
      default:
        throw new UnsupportedTypeError(`generic ${name}`, 'java.emitter');
    }
  }

  /** Generic parameters cannot be primitives. */
  private boxed(javaType: string): string {
    if (javaType === 'long') {
      return 'Long';
    }
    if (javaType === 'int') {
      return 'Integer';
    }
    if (javaType === 'boolean') {
      return 'Boolean';
    }
    return javaType;
  }

  protected mapScalar(s: IrScalar): string {
    switch (s.name) {
      case 'string':
      case 'timestamp':
      case 'date':
        return 'String';
      case 'integer':
        // Money is bigint-sized in Postgres; a Java int would overflow at
        // about 21 million dollars.
        return 'long';
      case 'number':
        return 'long';
      case 'boolean':
        return 'boolean';
      case 'unknown':
        return 'Object';
      default:
        throw new UnsupportedTypeError(`scalar ${String(s.name)}`, 'java.emitter');
    }
  }

  protected quoteIdentifier(n: string): string {
    return JAVA_RESERVED.has(n) ? `${n}Value` : n;
  }

  private constantNameFor(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  }

  private packagePath(): string {
    return `src/main/java/${this.options.packageName.replace(/\./g, '/')}`;
  }
}
