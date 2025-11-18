/**
 * Barrel completeness and layering.
 *
 * The frozen contract in `spec/contracts/types.ts` is the FLATTENED view of
 * `src/index.ts`. Splitting the file into `src/types/**` was only safe because
 * this test exists: a symbol added to a module and not re-exported here is
 * invisible to all four consumers and typechecks perfectly locally.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import * as barrel from './index';

const typesDir = path.resolve(__dirname, 'types');

function moduleFiles(): string[] {
  return fs
    .readdirSync(typesDir)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .sort();
}

function exportedNames(source: string): string[] {
  const names: string[] = [];
  const pattern = /^export\s+(?:const|interface|type|function|class)\s+([A-Za-z0-9_]+)/gm;
  let match = pattern.exec(source);
  while (match !== null) {
    if (match[1] !== undefined) {
      names.push(match[1]);
    }
    match = pattern.exec(source);
  }
  return names;
}

describe('src/index.ts', () => {
  const files = moduleFiles();

  it('has one re-export line per types/ module', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'index.ts'), 'utf8');
    const source = fs.readFileSync(path.join(typesDir, file), 'utf8');
    const runtimeExports = [...source.matchAll(/^export const ([A-Za-z0-9_]+)/gm)].map(
      (m) => m[1] ?? '',
    );

    for (const name of runtimeExports) {
      expect(
        Object.prototype.hasOwnProperty.call(barrel, name),
        `${name} is exported by types/${file} but not by the barrel`,
      ).toBe(true);
    }
  });

  it('declares no symbol twice across modules', () => {
    const seen = new Map<string, string>();
    for (const file of files) {
      const source = fs.readFileSync(path.join(typesDir, file), 'utf8');
      for (const name of exportedNames(source)) {
        const previous = seen.get(name);
        expect(previous, `${name} is declared in both ${previous} and ${file}`).toBeUndefined();
        seen.set(name, file);
      }
    }
  });
});

describe('layering', () => {
  const files = moduleFiles();

  // The cycle rule. types/** is the bottom of the graph and must stay there,
  // or the Python codegen's per-module read stops terminating.
  it.each(moduleFiles())('types/%s imports only other types/ modules', (file) => {
    const specifiers = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '');

    for (const specifier of specifiers) {
      expect(specifier.startsWith('./'), `types/${file} imports '${specifier}'`).toBe(true);
      expect(specifier).not.toContain('..');
    }
  });

  it('internal/ imports nothing at all', () => {
    const internalDir = path.resolve(__dirname, 'internal');
    const internalFiles = fs
      .readdirSync(internalDir)
      .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));

    expect(internalFiles.length).toBeGreaterThan(0);
    for (const file of internalFiles) {
      const source = fs.readFileSync(path.join(internalDir, file), 'utf8');
      expect(source, `internal/${file} must not import`).not.toMatch(/^import /m);
    }
  });

  it('codegen/ never imports the types it generates', () => {
  });
});
