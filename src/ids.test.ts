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

  it('marks the vault prefixes as owning no Payzeno entity', () => {
    expect(ID_PREFIXES.pmt.entity).toBeNull();
    expect(ID_PREFIXES.bat.entity).toBeNull();
    expect(ID_PREFIXES.pmt.owner).toBe('payzeno-vault');
  });

  it('names an owner service for every prefix', () => {
    for (const prefix of PREFIXES) {
      expect(ID_PREFIXES[prefix].owner).toMatch(/^payzeno-/);
    }
  });
});

describe('isUlid', () => {
  it('rejects the Crockford-excluded letters I, L, O and U', () => {
    expect(isUlid('01HQ8Z3K9X4M2N7P6R5T1V0W8I')).toBe(false);
    expect(isUlid('01HQ8Z3K9X4M2N7P6R5T1V0W8L')).toBe(false);
    expect(isUlid('01HQ8Z3K9X4M2N7P6R5T1V0W8O')).toBe(false);
    expect(isUlid('01HQ8Z3K9X4M2N7P6R5T1V0W8U')).toBe(false);
  });

  it('rejects lowercase and wrong lengths', () => {
    expect(isUlid(ULID.toLowerCase())).toBe(false);
    expect(isUlid(ULID.slice(0, 25))).toBe(false);
    expect(isUlid(`${ULID}Z`)).toBe(false);
  });

  it('rejects a timestamp that overflows 48 bits', () => {
    expect(isUlid(`8${ULID.slice(1)}`)).toBe(false);
    expect(isUlid(`Z${ULID.slice(1)}`)).toBe(false);
  });
});

describe('parseId', () => {
  it.each(PREFIXES)('round-trips %s_', (prefix) => {
    const parsed = parseId(`${prefix}_${ULID}`);
    expect(parsed.prefix).toBe(prefix);
    expect(parsed.ulid).toBe(ULID);
  });

  it('throws ValidationError on a missing separator', () => {
    expect(() => parseId(ULID)).toThrow(ValidationError);
    expect(() => parseId(`_${ULID}`)).toThrow(ValidationError);
  });

  it('throws ValidationError on an unknown prefix', () => {
    expect(() => parseId(`zzz_${ULID}`)).toThrow(ValidationError);
  });

  it('throws ValidationError on a malformed body', () => {
    expect(() => parseId('mch_not-a-ulid')).toThrow(ValidationError);
  });

  it('carries the id in details for the log line', () => {
    try {
      parseId(`zzz_${ULID}`);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as ValidationError).details).toMatchObject({ prefix: 'zzz' });
    }
  });
});

describe('validateId', () => {
  it('is the non-throwing twin of parseId', () => {
    expect(validateId(`ch_${ULID}`)).toBe(true);
    expect(validateId('nonsense')).toBe(false);
  });

});
