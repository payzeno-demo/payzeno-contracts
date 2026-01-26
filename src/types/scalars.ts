/**
 * Scalars and identifier aliases. Leaf module — imports nothing.
 * Everything else in `types/` sits on top of this.
 */

/** RFC 3339 UTC instant, e.g. `2026-03-14T09:21:07.412Z`. */
export type IsoTimestamp = string;

/** ISO 8601 calendar date, e.g. `2026-03-14`. Banking-calendar day, not an instant. */
export type IsoDate = string;

/** Basis points. 100 bps = 1%. */
export type BasisPoints = number;

export type UserId = string;
export type BankAccountId = string;
export type ChargeId = string;
export type RefundId = string;
export type DisputeId = string;
export type WebhookEventId = string;
export type LedgerTransactionId = string;
export type LedgerEntryId = string;
export type ReconciliationRunId = string;
export type PayoutId = string;
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS', 'JPY'] as const;
export interface Money {
  amount_minor: MinorUnits;
  currency: CurrencyCode;
}

