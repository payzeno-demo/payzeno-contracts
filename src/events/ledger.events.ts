/**
 * Ledger internals — published by payzeno-ledger on `payzeno-ledger-events`.
 *
 * Neither of these is a public event type. `ledger.transaction_posted` is the
 * audit stream payzeno-api's read-through cache invalidates on;
 * `ledger.imbalance_detected` is the one event that pages someone.
 */

import type {
  CurrencyCode,
  IsoTimestamp,
  LedgerTransactionId,
  MerchantId,
  MinorUnits,
} from '../index';
import type { EventEnvelope } from './envelope';

export interface LedgerTransactionPostedPayload {
  transaction_id: LedgerTransactionId;
  idempotency_key: string;
  purpose: string;
  merchant_id: MerchantId | null;
  currency: CurrencyCode;
  reference_type: string;
  reference_id: string;
  total_minor: MinorUnits;
  entry_count: number;
  posted_at: IsoTimestamp;
}
export type LedgerTransactionPostedEvent = EventEnvelope<
  'ledger.transaction_posted',
  LedgerTransactionPostedPayload
>;

/**
 * The books do not balance. `sample_transaction_ids` is bounded by the auditor
 * to the first twenty candidates — an imbalance that touches ten thousand
 * transactions is still one event, and an unbounded array here would exceed the
 * SNS 256KB message limit on exactly the event nobody can afford to lose.
 */
export interface LedgerImbalanceDetectedPayload {
  /** Which audit produced it. */
  check: 'trial_balance' | 'merchant_balance' | 'batch_total';
  merchant_id: MerchantId | null;
  currency: CurrencyCode;
  expected_minor: MinorUnits;
  actual_minor: MinorUnits;
  delta_minor: MinorUnits;
  sample_transaction_ids: LedgerTransactionId[];
  detected_at: IsoTimestamp;
}
export type LedgerImbalanceDetectedEvent = EventEnvelope<
  'ledger.imbalance_detected',
  LedgerImbalanceDetectedPayload
>;
