import { describe, expect, it } from 'vitest';

import { mulDivRoundHalfUp, pow10, roundHalfUp } from './rounding';

describe('pow10', () => {
  it('returns exact bigint powers', () => {
    expect(pow10(0)).toBe(1n);
    expect(pow10(2)).toBe(100n);
    expect(pow10(18)).toBe(1_000_000_000_000_000_000n);
  });

  it('rejects non-integer and out-of-range exponents', () => {
    expect(() => pow10(-1)).toThrow(RangeError);
    expect(() => pow10(19)).toThrow(RangeError);
    expect(() => pow10(1.5)).toThrow(RangeError);
  });
});

describe('roundHalfUp', () => {
  // This is the case Math.round gets wrong, and the one that produced a
  // 1-minor-unit trial-balance delta nobody could source.
  it('rounds .5 away from zero for NEGATIVE values', () => {
    expect(roundHalfUp(-5n, 10n)).toBe(-1n);
    expect(roundHalfUp(-15n, 10n)).toBe(-2n);
    expect(roundHalfUp(-25n, 10n)).toBe(-3n);
    expect(Math.round(-0.5)).toBe(-0);
  });

  it('normalises a negative denominator', () => {
    expect(roundHalfUp(5n, -10n)).toBe(-1n);
    expect(roundHalfUp(-5n, -10n)).toBe(1n);
  });

  it('keeps the intermediate exact beyond Number.MAX_SAFE_INTEGER', () => {
    // 9_007_199_254_740_993 * 10_000 overflows a double; the bigint path
    // must not.
    const value = 9_007_199_254_740_993n;
    expect(mulDivRoundHalfUp(value, 10_000n, 10_000n)).toBe(value);
  });

  it('throws on a zero divisor', () => {
    expect(() => mulDivRoundHalfUp(1n, 1n, 0n)).toThrow(RangeError);
  });
});
