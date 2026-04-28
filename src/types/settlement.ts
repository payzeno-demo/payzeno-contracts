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

