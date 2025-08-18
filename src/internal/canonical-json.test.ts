import { describe, expect, it } from 'vitest';

import { canonicalJson, stableKeys } from './canonical-json';

describe('stableKeys', () => {
  it('sorts and drops undefined values', () => {
    expect(stableKeys({ b: 1, a: 2, c: undefined })).toEqual(['a', 'b']);
  });
});

describe('canonicalJson', () => {
  it('is independent of insertion order', () => {
    const a = canonicalJson({ currency: 'USD', amount_minor: 4999, merchant_id: 'mch_1' });
    const b = canonicalJson({ merchant_id: 'mch_1', amount_minor: 4999, currency: 'USD' });
    expect(a).toBe(b);
    expect(a).toBe('{"amount_minor":4999,"currency":"USD","merchant_id":"mch_1"}');
  });

  it('sorts nested objects too', () => {
    const nested = canonicalJson({ outer: { z: 1, a: { y: 2, b: 3 } } });
    expect(nested).toBe('{"outer":{"a":{"b":3,"y":2},"z":1}}');
  });

  it('distinguishes undefined from null', () => {
    expect(canonicalJson({ a: null })).toBe('{"a":null}');
    expect(canonicalJson({ a: undefined })).toBe('{}');
    expect(canonicalJson({ a: undefined })).not.toBe(canonicalJson({ a: null }));
  });

  it('preserves array order — order is data', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
    expect(canonicalJson([3, 1, 2])).not.toBe(canonicalJson([1, 2, 3]));
  });

  it('emits no whitespace and no trailing newline', () => {
    const out = canonicalJson({ a: 1, b: [1, 2], c: { d: true } });
    expect(out).toBe('{"a":1,"b":[1,2],"c":{"d":true}}');
    expect(out).not.toMatch(/\s/);
  });

  it('normalises -0 to 0', () => {
    expect(canonicalJson({ v: -0 })).toBe(canonicalJson({ v: 0 }));
  });

  it('passes unicode through JSON.stringify escaping, unnormalised', () => {
    // NFC 'é' and NFD 'é' are different strings and must hash
    // differently — normalising here would make the Python side impossible.
    expect(canonicalJson({ k: 'é' })).not.toBe(canonicalJson({ k: 'é' }));
    expect(canonicalJson({ k: 'ünïcø∂é' })).toContain('ünïcø∂é');
  });

  it('throws on values JSON cannot represent', () => {
    expect(() => canonicalJson(undefined)).toThrow(TypeError);
    expect(() => canonicalJson({ v: 1n })).toThrow(TypeError);
    expect(() => canonicalJson({ v: () => 1 })).toThrow(TypeError);
    expect(() => canonicalJson({ v: Number.NaN })).toThrow(RangeError);
    expect(() => canonicalJson({ v: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });
});
