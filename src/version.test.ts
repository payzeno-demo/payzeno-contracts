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

  it('matches python/pyproject.toml', () => {
    const match = /^version = "(.+)"$/m.exec(read('python/pyproject.toml'));
    expect(match?.[1]).toBe(CONTRACTS_VERSION);
  });

  it('is a calendar date, not a semver', () => {
    expect(API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

});
