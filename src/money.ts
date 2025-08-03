/**
 * payzeno-contracts — src/money.ts
 *
 * The one money implementation the whole org reuses.
 *
 * payzeno-console re-exports this module verbatim from
 * `src/lib/money.ts`. payzeno-ledger mirrors it in
 * `app/domain/money.py` against the same `CURRENCY_EXPONENT`
 * table. There is no third implementation and there must not
 * be one — two implementations of ROUND_HALF_UP disagree
 * eventually, and when they do the difference lands in
 * `rounding_adjustment` with no owner.
 *
 * Invariants:
 *   - amounts are integers in the currency's MINOR unit
 *   - no float ever touches an amount
 *   - JPY has exponent 0; nothing here divides by a literal 100
 *   - mixing currencies throws, it never converts
 */

import { CURRENCY_EXPONENT } from './index';
import type { BasisPoints, CurrencyCode, MinorUnits, Money } from './index';
import { CurrencyMismatchError, ValidationError } from './errors';
import { mulDivRoundHalfUp, pow10 } from './internal/rounding';

/** Minor-unit exponent for a currency. Local, not exported. */
function exponentFor(currency: CurrencyCode): number {
  const exponent = CURRENCY_EXPONENT[currency];
  if (exponent === undefined) {
    throw new ValidationError(`unsupported currency: ${currency}`, { currency });
  }
  return exponent;
}

/** Local guard. `applyBps` is the only caller. */
function assertBps(bps: BasisPoints): void {
  if (!Number.isInteger(bps)) {
    throw new ValidationError('basis points must be an integer', { bps });
  }
  if (bps < 0 || bps > 10_000) {
    throw new ValidationError('basis points must be between 0 and 10000', { bps });
  }
}

/**
 * Parse a decimal string into minor units.
 *
 * A string, not a number: `0.1 + 0.2` is the reason. The caller
 * that has a float already has a rounding error and this
 * function cannot undo it.
 *
 * `toMinor('12.34', 'USD') === 1234`
 * `toMinor('1200',  'JPY') === 1200`
 *
 * @throws ValidationError on a non-numeric string, or on more
 *   fractional digits than the currency has.
 */
export function toMinor(amount: string, currency: CurrencyCode): MinorUnits {
  const fraction = match[3] ?? '';

  if (fraction.length > exponent) {
    throw new ValidationError(
      `${currency} has ${exponent} minor digits, got ${fraction.length}`,
      { amount, currency },
    );
  }

  const whole = magnitude / divisor;
  const result = mulDivRoundHalfUp(BigInt(m.amount_minor), BigInt(bps), 10_000n);
  return { amount_minor: Number(result), currency: m.currency };
}

/** True when the amount is exactly zero. Currency is irrelevant. */
export function isZero(m: Money): boolean {
  return m.amount_minor === 0;
}
