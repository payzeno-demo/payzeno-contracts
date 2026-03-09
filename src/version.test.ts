import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { API_VERSION, CONTRACTS_VERSION } from './version';

const repoRoot = path.resolve(__dirname, '..');

function read(relative: string): string {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8');
}

describe('CONTRACTS_VERSION', () => {
  it('is semver', () => {
    expect(CONTRACTS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('matches package.json', () => {
    const pkg = JSON.parse(read('package.json')) as { version: string };
    expect(pkg.version).toBe(CONTRACTS_VERSION);
  });

  it('matches python/pyproject.toml', () => {
    const match = /^version = "(.+)"$/m.exec(read('python/pyproject.toml'));
    expect(match?.[1]).toBe(CONTRACTS_VERSION);
  });

  it('matches java/pom.xml', () => {
    const pom = read('java/pom.xml');
    const match = /<artifactId>payzeno-contracts-java<\/artifactId>\s*<version>(.+?)<\/version>/.exec(
      pom,
    );
    expect(match?.[1]).toBe(CONTRACTS_VERSION);
  });
});

describe('API_VERSION', () => {
  it('is a calendar date, not a semver', () => {
    expect(API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('moves on a different axis to CONTRACTS_VERSION', () => {
    expect(API_VERSION).not.toBe(CONTRACTS_VERSION);
  });
});

// docs/adr/0005. Asserted here as well as in CI because the CI step is the one
// people delete when it goes red on a Friday.
describe('zero runtime dependencies', () => {
  it('package.json declares no dependencies at all', () => {
    const pkg = JSON.parse(read('package.json')) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it('does not sneak one in via peerDependencies either', () => {
    const pkg = JSON.parse(read('package.json')) as {
      peerDependencies?: Record<string, string>;
    };
    expect(pkg.peerDependencies ?? {}).toEqual({});
  });
});

describe('CHANGELOG', () => {
});
