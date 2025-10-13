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
