/**
 * Settlement — published by payzeno-ledger on `payzeno-ledger-events`.
 *
 * This is the busiest module in the package and the one the incident touched
 * twice. Read the `SettlementCompletedPayload` and
 * `SettlementDuplicateDetectedPayload` docblocks before changing anything here;
 * both of them exist because a consumer somewhere lost money-shaped state.
 */

import type {
  Acquirer,
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
} from '../index';
import type { EventEnvelope } from './envelope';

export interface SettlementBatchClosedPayload {
  batch_id: SettlementBatchId;
  acquirer: Acquirer;
  currency: CurrencyCode;
  processing_date: IsoDate;
  item_count: number;
  expected_total_minor: MinorUnits;
  closed_at: IsoTimestamp;
}
export type SettlementBatchClosedEvent = EventEnvelope<
  'settlement.batch_closed',
  SettlementBatchClosedPayload
>;

export interface SettlementItemSettledPayload {
  item_id: ReconciliationItemId;
  batch_id: SettlementBatchId;
  charge_id: ChargeId;
  merchant_id: MerchantId;
  gross_minor: MinorUnits;
  fee_minor: MinorUnits;
  net_minor: MinorUnits;
  currency: CurrencyCode;
  transaction_id: LedgerTransactionId;
  attempt_count: number;
  settled_at: IsoTimestamp;
}
export type SettlementItemSettledEvent = EventEnvelope<
  'settlement.item_settled',
  SettlementItemSettledPayload
>;

/**
 * The batch finished. payzeno-api consumes this to flip every charge in the batch
 * `captured -> settled` and to stamp `settlement_batch_id`.
 */
export interface SettlementCompletedPayload {
  batch_id: SettlementBatchId;
  run_id: ReconciliationRunId;
  acquirer: Acquirer;
  currency: CurrencyCode;
  processing_date: IsoDate;
  items_total: number;
  items_settled: number;
  items_failed: number;
  posted_total_minor: MinorUnits;
  fee_total_minor: MinorUnits;
  net_total_minor: MinorUnits;
  /**
   * Charges the API side should mark `settled`. Chunked at 1000 per event.
   *
   * This is the SOLE driver of `charge captured -> settled`, over an at-least-once,
   * explicitly unordered bus. A chunk lost to the DLQ therefore strands those charges
   * `captured` with a null `settlement_batch_id` forever. payzeno-api records arrivals in
   * `settlement_completion (batch_id, run_id, chunk_count, chunks_seen)` and marks the batch
   * complete only when every index 0..chunk_count-1 is present; `UnsettledChargeSweepJob`
   * reads `pix_charge_unsettled` and self-heals the rest via
   * `LedgerHttpClient.listTransactions(reference_type='charge')`. PAY-2058.
   */
  settled_charge_ids: ChargeId[];
  chunk_index: number;
  chunk_count: number;
  completed_at: IsoTimestamp;
}
export type SettlementCompletedEvent = EventEnvelope<
  'settlement.completed',
  SettlementCompletedPayload
>;

export interface SettlementReconciliationFailedPayload {
  batch_id: SettlementBatchId;
  run_id: ReconciliationRunId;
  items_failed: number;
  items_orphaned: number;
  error_summary: string;
  failed_at: IsoTimestamp;
}
export type SettlementReconciliationFailedEvent = EventEnvelope<
  'settlement.reconciliation_failed',
  SettlementReconciliationFailedPayload
>;

/**
 * Emitted when the settlement poster refuses a posting because an equivalent
 * transaction already exists for the same idempotency key.
 *
 * ADDED BY THE INC HOTFIX (arc INC, PAY-2043). It does not exist before that commit —
 * generation agents must not emit it from earlier code. Its arrival rate is the metric
 * the CloudWatch alarm `payzeno-ledger-duplicate-settlement` watches.
 */
export interface SettlementDuplicateDetectedPayload {
  batch_id: SettlementBatchId;
  item_id: ReconciliationItemId;
  /** Nullable, because `reconciliation_item.charge_id` / `.merchant_id` are (data-model §3.5). */
  charge_id: ChargeId | null;
  merchant_id: MerchantId | null;
  idempotency_key: string;
  existing_transaction_id: LedgerTransactionId;
  /** `batch_pass` or `retry_scheduler` — which path lost the race. */
  detected_by: 'batch_pass' | 'retry_scheduler';
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  detected_at: IsoTimestamp;
}
export type SettlementDuplicateDetectedEvent = EventEnvelope<
  'settlement.duplicate_detected',
  SettlementDuplicateDetectedPayload
>;

/**
 * The acquirer settled a different amount than we authorised — partial capture, interchange
 * downgrade, DCC, or a file error. Beyond `merchant.settlement_tolerance_minor` the item goes
 * to `variance_exceeded` and NOTHING is posted. Without this branch a wrong acquirer file
 * silently credits the merchant the wrong amount and the ledger stays internally balanced,
 * which is the exact failure mode the PAY-2041 postmortem calls undetectable.
 */
export interface SettlementVarianceDetectedPayload {
  batch_id: SettlementBatchId;
  item_id: ReconciliationItemId;
  charge_id: ChargeId | null;
  merchant_id: MerchantId | null;
  line_type: string;
  expected_gross_minor: MinorUnits;
  actual_gross_minor: MinorUnits;
  variance_minor: MinorUnits;
  tolerance_minor: MinorUnits;
  currency: CurrencyCode;
  detected_at: IsoTimestamp;
}
export type SettlementVarianceDetectedEvent = EventEnvelope<
  'settlement.variance_detected',
  SettlementVarianceDetectedPayload
>;

/** A `funding_event` matched the batch within tolerance; `settlement_funding` posted. */
export interface SettlementFundedPayload {
  batch_id: SettlementBatchId;
  funding_event_id: string;
  acquirer: Acquirer;
  currency: CurrencyCode;
  expected_total_minor: MinorUnits;
  funded_amount_minor: MinorUnits;
  variance_minor: MinorUnits;
  bank_reference: string;
  value_date: IsoDate;
  transaction_id: LedgerTransactionId;
  funded_at: IsoTimestamp;
}
export type SettlementFundedEvent = EventEnvelope<'settlement.funded', SettlementFundedPayload>;
