/**
 * Scalars and identifier aliases. Leaf module — imports nothing.
 * Everything else in `types/` sits on top of this.
 */

/** RFC 3339 UTC instant, e.g. `2026-03-14T09:21:07.412Z`. */
export type IsoTimestamp = string;

export type BankAccountId = string;
export type PayoutId = string;
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS', 'JPY'] as const;
