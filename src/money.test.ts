import { describe, expect, it } from 'vitest';

import { CurrencyMismatchError, ValidationError } from './errors';
import {
  addMoney,
  applyBps,
  assertSameCurrency,
  formatMoney,
  fromMinor,
  isZero,
  subMoney,
  toMinor,
} from './money';
import { sampleMoney } from './test-support/fixtures';

describe('toMinor', () => {
  it('parses two-exponent currencies', () => {
    expect(toMinor('12.34', 'USD')).toBe(1234);
    expect(toMinor('0.05', 'EUR')).toBe(5);
    expect(toMinor('100', 'GBP')).toBe(10_000);
    expect(toMinor('-12.34', 'ILS')).toBe(-1234);
  });

  it('parses JPY at exponent 0', () => {
    expect(toMinor('1200', 'JPY')).toBe(1200);
    expect(() => toMinor('1200.5', 'JPY')).toThrow(ValidationError);
  });

  it('rejects junk', () => {
    expect(() => toMinor('twelve', 'USD')).toThrow(ValidationError);
    expect(() => toMinor('12.345', 'USD')).toThrow(ValidationError);
    expect(() => toMinor('', 'USD')).toThrow(ValidationError);
  });
});

describe('fromMinor', () => {
  it('round-trips through toMinor', () => {
    for (const amount of ['0.00', '0.01', '12.34', '-12.34', '99999.99']) {
      expect(fromMinor(toMinor(amount, 'USD'), 'USD')).toBe(amount);
    }
  });

  it('pads the fraction', () => {
    expect(fromMinor(5, 'USD')).toBe('0.05');
    expect(fromMinor(-5, 'USD')).toBe('-0.05');
  });

  it('emits no decimal point for JPY', () => {
    expect(fromMinor(1200, 'JPY')).toBe('1200');
  });
});

describe('formatMoney', () => {
  it('formats with the currency symbol', () => {
    expect(formatMoney({ amount_minor: 1234, currency: 'USD' })).toContain('12.34');
  });

  // dhotfix: JPY is exponent 0 — see CURRENCY_EXPONENT.
  it('does not divide JPY by 100', () => {
    const formatted = formatMoney({ amount_minor: 1200, currency: 'JPY' }, 'en-US');
    expect(formatted).toContain('1,200');
    expect(formatted).not.toContain('12.00');
  });
});

describe('assertSameCurrency', () => {
  it('passes for matching currencies', () => {
    expect(() => assertSameCurrency(sampleMoney('USD'), sampleMoney('USD'))).not.toThrow();
  });

  it('throws CurrencyMismatchError, never converts', () => {
    expect(() => assertSameCurrency(sampleMoney('USD'), sampleMoney('EUR'))).toThrow(
      CurrencyMismatchError,
    );
  });

  it('carries both currencies in details', () => {
    try {
      assertSameCurrency(sampleMoney('USD'), sampleMoney('JPY'));
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CurrencyMismatchError);
      expect((error as CurrencyMismatchError).details).toEqual({ left: 'USD', right: 'JPY' });
      expect((error as CurrencyMismatchError).httpStatus).toBe(400);
    }
  });
});

describe('addMoney / subMoney', () => {
  it('adds and subtracts within a currency', () => {
    expect(addMoney(sampleMoney('USD', 100), sampleMoney('USD', 23))).toEqual({
      amount_minor: 123,
      currency: 'USD',
    });
    expect(subMoney(sampleMoney('USD', 100), sampleMoney('USD', 123))).toEqual({
      amount_minor: -23,
      currency: 'USD',
    });
  });

  it('throws on a currency mismatch', () => {
    expect(() => addMoney(sampleMoney('USD'), sampleMoney('GBP'))).toThrow(CurrencyMismatchError);
    expect(() => subMoney(sampleMoney('USD'), sampleMoney('GBP'))).toThrow(CurrencyMismatchError);
  });
});

describe('applyBps', () => {
  it('rounds ROUND_HALF_UP at the boundary', () => {
    // 100 * 50 bps = 0.5 minor units -> 1
    expect(applyBps(sampleMoney('USD', 100), 50).amount_minor).toBe(1);
    // and the negative twin rounds away from zero, not toward it
    expect(applyBps(sampleMoney('USD', -100), 50).amount_minor).toBe(-1);
    // 4999 * 290 bps = 144.971 -> 145
    expect(applyBps(sampleMoney('USD', 4999), 290).amount_minor).toBe(145);
  });

  it('handles the degenerate rates', () => {
    expect(applyBps(sampleMoney('USD', 4999), 0).amount_minor).toBe(0);
    expect(applyBps(sampleMoney('USD', 4999), 10_000).amount_minor).toBe(4999);
  });

  it('preserves the currency', () => {
    expect(applyBps(sampleMoney('JPY', 1200), 290).currency).toBe('JPY');
  });

  it('throws ValidationError outside 0..10000', () => {
    expect(() => applyBps(sampleMoney(), -1)).toThrow(ValidationError);
    expect(() => applyBps(sampleMoney(), 10_001)).toThrow(ValidationError);
    expect(() => applyBps(sampleMoney(), 12.5)).toThrow(ValidationError);
  });
});

describe('isZero', () => {
  it('is currency-blind', () => {
    expect(isZero({ amount_minor: 0, currency: 'JPY' })).toBe(true);
    expect(isZero({ amount_minor: 0, currency: 'USD' })).toBe(true);
    expect(isZero(sampleMoney('USD', 1))).toBe(false);
  });
});
