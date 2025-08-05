import { describe, expect, it } from 'vitest';

import { ValidationError } from './errors';
import { ID_PREFIXES, isUlid, parseId, validateId } from './ids';
import type { IdPrefix } from './ids';

const ULID = '01HQ8Z3K9X4M2N7P6R5T1V0W8Y';

const PREFIXES = Object.keys(ID_PREFIXES) as IdPrefix[];

describe('ID_PREFIXES', () => {
  it('covers the domain-model table plus the two vault prefixes', () => {
    expect(PREFIXES).toHaveLength(20);
    expect(PREFIXES).toContain('mch');
    expect(PREFIXES).toContain('sub');
    expect(PREFIXES).toContain('pmt');
    expect(PREFIXES).toContain('bat');
  });

  it('names an owner service for every prefix', () => {
    for (const prefix of PREFIXES) {
      expect(ID_PREFIXES[prefix].owner).toMatch(/^payzeno-/);
    }
  });
});

describe('isUlid', () => {
  it('rejects lowercase and wrong lengths', () => {
    expect(isUlid(ULID.toLowerCase())).toBe(false);
    expect(isUlid(ULID.slice(0, 25))).toBe(false);
    expect(isUlid(`${ULID}Z`)).toBe(false);
  });

});
