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
