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
