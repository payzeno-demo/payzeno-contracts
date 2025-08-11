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
export type ReconciliationLineType = (typeof RECONCILIATION_LINE_TYPES)[number];

