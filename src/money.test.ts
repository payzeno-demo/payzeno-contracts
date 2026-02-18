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
  // dhotfix: JPY is exponent 0 — see CURRENCY_EXPONENT.
  it('does not divide JPY by 100', () => {
    const formatted = formatMoney({ amount_minor: 1200, currency: 'JPY' }, 'en-US');
    expect(formatted).toContain('1,200');
    expect(formatted).not.toContain('12.00');
  });
});

describe('assertSameCurrency', () => {
  it('throws CurrencyMismatchError, never converts', () => {
    expect(() => assertSameCurrency(sampleMoney('USD'), sampleMoney('EUR'))).toThrow(
      CurrencyMismatchError,
    );
  });

  it('throws ValidationError outside 0..10000', () => {
    expect(() => applyBps(sampleMoney(), -1)).toThrow(ValidationError);
    expect(() => applyBps(sampleMoney(), 10_001)).toThrow(ValidationError);
    expect(() => applyBps(sampleMoney(), 12.5)).toThrow(ValidationError);
  });
});

describe('isZero', () => {
});
