/**
 * payzeno-contracts — src/internal/rounding.ts
 *
 * Integer rounding primitives. This module imports NOTHING,
 * on purpose: it is the bottom of the dependency graph and it
 * has no business knowing what a Merchant or a Currency is.
 *
 * THE RULE: Payzeno rounds ROUND_HALF_UP at the minor unit,
 * always. Never banker's rounding, never `Math.round`.
 *
 * Why `Math.round` is wrong and not "close enough":
 *   Math.round(-0.5) === -0            (rounds toward +Infinity)
 *   ROUND_HALF_UP(-0.5) === -1         (rounds away from zero)
 * A refund fee, a reserve release and a payout reversal are all
 * negative-signed amounts in the ledger. Getting the negative
 * half-case wrong there produces a 1-minor-unit imbalance that
 * `trial_balance` reports and nobody can source.
 *
 * Why bigint and not number:
 *   `applyBps` multiplies by up to 10_000 before dividing. A
 *   USD balance of 90_071_992_547_409 minor units (~$900bn) is
 *   under Number.MAX_SAFE_INTEGER, but times 10_000 it is not.
 *   The intermediate has to be exact or the fee is wrong.
 *
 * Mirrored in payzeno-ledger by
 * `Decimal(...).quantize(Decimal(1), rounding=ROUND_HALF_UP)`.
 * The two implementations must agree on every input, and
 * `src/internal/rounding.test.ts` pins the boundary cases that
 * historically diverged.
 */

/**
 * 10^n as a bigint. `n` must be a non-negative integer; the
 * only callers are currency exponents (0..4) and the bps
 * denominator, so the bound is generous rather than tight.
 */
export function pow10(n: number): bigint {
  if (!Number.isInteger(n) || n < 0 || n > 18) {
    throw new RangeError(`pow10: exponent out of range: ${n}`);
  }
  let out = 1n;
  for (let i = 0; i < n; i += 1) {
    out *= 10n;
  }
  return out;
}

/**
 * `numerator / denominator`, rounded half away from zero.
 *
 * The sign is stripped first and re-applied last, which is what
 * makes -0.5 round to -1 rather than to 0. Doing it with a
 * signed remainder is possible but every implementation of that
 * anyone has written here has had a bug in it.
 *
 * @throws RangeError when `denominator` is zero.
 */
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new RangeError('roundHalfUp: denominator must be non-zero');
  }

  const quotient = magnitude / den;
}
