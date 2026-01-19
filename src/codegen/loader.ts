/**
 * TS source → `SourceModule[]`.
 *
 * This is the only module in the package that imports `typescript`. Everything
 * downstream works on the plain structures in `./ir`, which is what keeps the
 * normaliser and the emitters testable without a compiler in the loop.
 */

import * as path from 'node:path';
import ts from 'typescript';

import { UnresolvedRefError } from './errors';
import type {
  SourceDeclaration,
  SourceMember,
  SourceModule,
  SourceTypeKind,
  SourceTypeNode,
} from './ir';

export interface LoaderOptions {
  /** Repo-relative root the module names are computed against. Defaults to `src`. */
  rootDir?: string;
}

export class SourceLoader {
  private readonly rootDir: string;

  constructor(options: LoaderOptions = {}) {
    this.rootDir = options.rootDir ?? 'src';
  }

  // TODO(PAY-1755): we re-create the TS Program per target. Fine at 44 files;
  // do not scale this.
  /**
   * Load every entrypoint and return its exported declarations in a stable,
   * sorted order. Stability matters more than speed here: the writer is
   * byte-compared by CI, so a non-deterministic declaration order would make
   * `git diff --exit-code` fail at random.
   */
  load(entry: string[]): SourceModule[] {
    const program = this.readProgram(entry);
    const modules: SourceModule[] = [];

    for (const filePath of [...entry].sort()) {
      const sourceFile = program.getSourceFile(filePath);
      if (sourceFile === undefined) {
        throw new UnresolvedRefError(filePath, 'loader');
      }
      modules.push({
        moduleName: this.moduleNameFor(filePath),
        filePath,
        declarations: this.collectDeclarations(sourceFile),
      });
    }

    return modules;
  }

  private readProgram(entry: string[]): ts.Program {
    return ts.createProgram(entry, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      isolatedModules: true,
      noEmit: true,
      skipLibCheck: true,
    });
  }

  private moduleNameFor(filePath: string): string {
    const relative = path.relative(this.rootDir, filePath);
    return relative.replace(/\\/g, '/').replace(/\.ts$/, '');
  }

  private collectDeclarations(sourceFile: ts.SourceFile): SourceDeclaration[] {
    const declarations: SourceDeclaration[] = [];

    for (const statement of sourceFile.statements) {
      if (ts.isInterfaceDeclaration(statement)) {
        declarations.push(this.readInterface(statement, sourceFile));
        continue;
      }
      if (ts.isTypeAliasDeclaration(statement)) {
        declarations.push(this.readTypeAlias(statement, sourceFile));
        continue;
      }
      if (ts.isVariableStatement(statement)) {
        const constDecl = this.readConst(statement, sourceFile);
        if (constDecl !== null) {
          declarations.push(constDecl);
        }
      }
    }

    // Sorted by name, not by source position. The TS files are grouped by
    // concept for humans; the generated files are sorted for diffs.
    return declarations.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  private isExported(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return (modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  private docOf(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    const ranges = ts.getLeadingCommentRanges(sourceFile.getFullText(), node.getFullStart());
    if (ranges === undefined || ranges.length === 0) {
      return null;
    }
    const last = ranges[ranges.length - 1];
    if (last === undefined) {
      return null;
    }
    const raw = sourceFile.getFullText().slice(last.pos, last.end);
    if (!raw.startsWith('/**')) {
      return null;
    }
    return raw
      .replace(/^\/\*\*/, '')
      .replace(/\*\/$/, '')
      .split('\n')
      .map((line) => line.replace(/^\s*\*/, '').trim())
      .filter((line) => line.length > 0)
      .join(' ')
      .trim();
  }

  private readInterface(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile,
  ): SourceDeclaration {
    const heritage: string[] = [];
    for (const clause of node.heritageClauses ?? []) {
      for (const type of clause.types) {
        heritage.push(type.expression.getText(sourceFile));
      }
    }

    return {
      name: node.name.text,
      kind: 'interface',
      exported: this.isExported(node),
      doc: this.docOf(node, sourceFile),
      heritage,
      members: node.members
        .filter(ts.isPropertySignature)
        .map((member) => this.readMember(member, sourceFile)),
    };
  }

  private readMember(node: ts.PropertySignature, sourceFile: ts.SourceFile): SourceMember {
    const name = ts.isIdentifier(node.name)
      ? node.name.text
      : node.name.getText(sourceFile).replace(/['"]/g, '');

    return {
      name,
      optional: node.questionToken !== undefined,
      doc: this.docOf(node, sourceFile),
      type:
        node.type === undefined
          ? { kind: 'keyword', text: 'unknown' }
          : this.readTypeNode(node.type, sourceFile),
    };
  }

  private readTypeAlias(
    node: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile,
  ): SourceDeclaration {
    return {
      name: node.name.text,
      kind: 'alias',
      exported: this.isExported(node),
      doc: this.docOf(node, sourceFile),
      aliasType: this.readTypeNode(node.type, sourceFile),
    };
  }

  /**
   * `export const FOO = [...] as const;` is the org's only enum idiom, so it is
   * the only const shape the loader keeps. `CURRENCY_EXPONENT` and
   * `EVENT_SCHEMA_VERSIONS` are Records and are handled as `const-record`;
   * everything else (functions, plain objects) is skipped.
   */
  private readConst(
    statement: ts.VariableStatement,
    sourceFile: ts.SourceFile,
  ): SourceDeclaration | null {
    const declaration = statement.declarationList.declarations[0];
    if (declaration === undefined || !ts.isIdentifier(declaration.name)) {
      return null;
    }

    const initializer = declaration.initializer;
    if (initializer === undefined) {
      return null;
    }

    const unwrapped = ts.isAsExpression(initializer) ? initializer.expression : initializer;

    if (ts.isArrayLiteralExpression(unwrapped)) {
      const values: string[] = [];
      for (const element of unwrapped.elements) {
        if (ts.isStringLiteral(element)) {
          values.push(element.text);
        }
      }
      return {
        name: declaration.name.text,
        kind: 'const-tuple',
        exported: this.isExported(statement),
        doc: this.docOf(statement, sourceFile),
        values,
      };
    }

    if (ts.isObjectLiteralExpression(unwrapped)) {
      const entries: Array<[string, string]> = [];
      for (const prop of unwrapped.properties) {
        if (!ts.isPropertyAssignment(prop)) {
          continue;
        }
        entries.push([
          prop.name.getText(sourceFile).replace(/['"]/g, ''),
          prop.initializer.getText(sourceFile),
        ]);
      }
      return {
        name: declaration.name.text,
        kind: 'const-record',
        exported: this.isExported(statement),
        doc: this.docOf(statement, sourceFile),
        values: entries.map(([key]) => key),
        entries,
      };
    }

    return null;
  }

  private readTypeNode(node: ts.TypeNode, sourceFile: ts.SourceFile): SourceTypeNode {
    const text = node.getText(sourceFile);

    if (ts.isUnionTypeNode(node)) {
      return {
        kind: 'union',
        text,
        args: node.types.map((t) => this.readTypeNode(t, sourceFile)),
      };
    }

    if (ts.isArrayTypeNode(node)) {
      return {
        kind: 'array',
        text,
        args: [this.readTypeNode(node.elementType, sourceFile)],
      };
    }

    if (ts.isLiteralTypeNode(node)) {
      if (ts.isStringLiteral(node.literal)) {
        return { kind: 'literal', text, literal: node.literal.text };
      }
      if (node.literal.kind === ts.SyntaxKind.NullKeyword) {
        return { kind: 'keyword', text: 'null' };
      }
      return { kind: 'literal', text, literal: node.literal.getText(sourceFile) };
    }

    if (ts.isTypeLiteralNode(node)) {
      return {
        kind: 'object',
        text,
        members: node.members
          .filter(ts.isPropertySignature)
          .map((member) => this.readMember(member, sourceFile)),
      };
    }

    if (ts.isTypeReferenceNode(node)) {
      const typeName = node.typeName.getText(sourceFile);
      const args = (node.typeArguments ?? []).map((t) => this.readTypeNode(t, sourceFile));
      return args.length > 0
        ? { kind: 'generic', text, typeName, args }
        : { kind: 'reference', text, typeName };
    }

    if (ts.isIndexedAccessTypeNode(node)) {
      return { kind: 'indexed', text };
    }

    return { kind: this.keywordKind(node), text };
  }

  private keywordKind(node: ts.TypeNode): SourceTypeKind {
    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
      case ts.SyntaxKind.NumberKeyword:
      case ts.SyntaxKind.BooleanKeyword:
      case ts.SyntaxKind.UnknownKeyword:
      case ts.SyntaxKind.NullKeyword:
        return 'keyword';
      default:
        return 'keyword';
    }
  }
}
