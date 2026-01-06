import { describe, expect, it } from 'vitest';

import { CURRENCIES, CURRENCY_EXPONENT } from './scalars';

describe('CURRENCIES', () => {
  it('is the five supported currencies, uppercase ISO-4217', () => {
    expect([...CURRENCIES]).toEqual(['USD', 'EUR', 'GBP', 'ILS', 'JPY']);
    for (const currency of CURRENCIES) {
      expect(currency).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('has a key per CURRENCIES member and no extras', () => {
    expect(Object.keys(CURRENCY_EXPONENT).sort()).toEqual([...CURRENCIES].sort());
  });

  it('is JPY = 0 — anything that hardcodes 100 is a bug', () => {
    expect(CURRENCY_EXPONENT.JPY).toBe(0);
  });

  it('is 2 for the rest', () => {
    for (const currency of CURRENCIES) {
      if (currency !== 'JPY') {
        expect(CURRENCY_EXPONENT[currency]).toBe(2);
      }
    }
  });

  it('is a non-negative integer everywhere', () => {
    for (const currency of CURRENCIES) {
      const exponent = CURRENCY_EXPONENT[currency];
      expect(Number.isInteger(exponent)).toBe(true);
      expect(exponent).toBeGreaterThanOrEqual(0);
    }
  });
});
