/**
 * Settlement batches, reconciliation runs and items, funding events.
 *
 * Owned by payzeno-ledger. payzeno-api exposes a strict subset of it and the
 * console never sees the acquirer-level objects at all.
 */

import type { ReconciliationRunStatus } from './enums';
import type {
  ChargeId,
  CurrencyCode,
  IsoDate,
  IsoTimestamp,
  LedgerTransactionId,
  MerchantId,
  MinorUnits,
  ReconciliationItemId,
  ReconciliationRunId,
  SettlementBatchId,
} from './scalars';

export const SETTLEMENT_BATCH_STATUSES = [
  'open',
  'closed',
  'reconciling',
  'reconciled',
  'partially_reconciled',
  /** Cash matched a funding_event within tolerance. Only funded batches release payouts. */
  'funded',
  'failed',
] as const;
export const ACQUIRERS = ['worldflow', 'nordpay'] as const;
export type Acquirer = (typeof ACQUIRERS)[number];

export interface MerchantSettlementBatch {
  id: SettlementBatchId;
  object: 'merchant_settlement_batch';
  merchant_id: MerchantId;
  currency: CurrencyCode;
  processing_date: IsoDate;
  acquirer: Acquirer;
  status: SettlementBatchStatus;
  /** This merchant's items in the batch, and their net. Nothing else. */
  item_count: number;
  net_minor: MinorUnits;
  funded_at: IsoTimestamp | null;
}

export type ReconciliationItemStatus = (typeof RECONCILIATION_ITEM_STATUSES)[number];

/**
 * Acquirer settlement files carry far more than sales. Without a line type every refund,
 * chargeback and fee line matches no charge and lands in `orphaned` — "manual investigation"
 * for a large fraction of every batch — and SettlementPoster builds a sale posting for all
 * of them regardless.
 */
export const RECONCILIATION_LINE_TYPES = [
  'sale',
  'refund',
  'chargeback',
  'chargeback_reversal',
  'scheme_fee',
  'adjustment',
  'reserve_hold',
  'reserve_release',
] as const;
export type ReconciliationLineType = (typeof RECONCILIATION_LINE_TYPES)[number];

export type MatchMethod = (typeof MATCH_METHODS)[number];

export interface ReconciliationItem {
  id: ReconciliationItemId;
  object: 'reconciliation_item';
  batch_id: SettlementBatchId;
  charge_id: ChargeId | null;
  merchant_id: MerchantId | null;
  line_type: ReconciliationLineType;
  gross_minor: MinorUnits;
  /** What the acquirer kept. An expense, not revenue. = interchange + scheme + acquirer markup. */
  fee_minor: MinorUnits;
  interchange_minor: MinorUnits;
  scheme_fee_minor: MinorUnits;
  net_minor: MinorUnits;
  /** From `settlement_charge.amount_minor` at match time. Null on unmatched lines. */
  expected_gross_minor: MinorUnits | null;
  variance_minor: MinorUnits;
  currency: CurrencyCode;
  livemode: boolean;
  acquirer_reference: string;
  match_method: MatchMethod;
  matched_at: IsoTimestamp | null;
  status: ReconciliationItemStatus;
  attempt_count: number;
  last_error_code: string | null;
  last_attempt_at: IsoTimestamp | null;
  /**
   * Exponential backoff with jitter. The retry drain filters on this, not on
   * `last_attempt_at` — that is the observation behind
   * `ix_reconciliation_item_next_attempt` (PAY-2071, arc PERF). Filtering on
   * `last_attempt_at` and computing the backoff in the application makes the
   * index unusable and the drain scans the whole table.
   */
  next_attempt_at: IsoTimestamp;
  settled_transaction_id: LedgerTransactionId | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

