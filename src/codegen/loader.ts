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
