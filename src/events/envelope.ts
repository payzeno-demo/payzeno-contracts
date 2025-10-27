/**
 * The bus envelope and the event-type vocabulary.
 *
 * Every event that crosses the bus is wrapped in exactly this. No exceptions,
 * including the ones a service publishes only to itself — a consumer that can
 * assume the envelope is a consumer that can be written once
 * (`BaseEventConsumer` in payzeno-api, `BaseConsumer` in payzeno-ledger).
 *
 * Delivery is at-least-once and ordering is NOT guaranteed. Two consequences
 * that consumers keep re-learning the hard way:
 *
 *   1. Dedupe on `id`, with an INSERT-FIRST claim on `processed_event`, in the
 *      SAME transaction as the side effect. A check-then-act
 *      `alreadyProcessed()` / `handle()` / `markProcessed()` is the exact shape
 *      of PAY-2041 and is forbidden by ADR 0011.
 *   2. Never order by arrival. Use `occurred_at` plus the entity's own state.
 *      Projection writes are conditional upserts guarded on
 *      `source_occurred_at < EXCLUDED.source_occurred_at`, or an old
 *      `merchant.status_changed` silently un-suspends a merchant.
 */

import type { MerchantId, IsoTimestamp } from '../index';

/** Every event that crosses the bus is wrapped in exactly this. No exceptions. */
export interface EventEnvelope<TType extends string, TPayload> {
  /** `evt_` + ULID. The idempotency key for every consumer. */
  id: string;
  type: TType;
  version: number;
  /** When the fact became true in the producer, NOT when it was published. */
  occurred_at: IsoTimestamp;
  /** Service that published it. */
  source: 'payzeno-api' | 'payzeno-ledger' | 'payzeno-billing-legacy';
  /** Trace correlation — propagated from the originating HTTP request where one exists. */
  correlation_id: string;
  /** `evt_` id of the event that caused this one, when there is one. */
  causation_id: string | null;
  /** Tenant scope. Null only for platform-wide events. */
  merchant_id: MerchantId | null;
  livemode: boolean;
  payload: TPayload;
}

export const EVENT_TYPES = [
  'payment.authorized',
  'payment.captured',
  'payment.failed',
  'payment.canceled',
  'refund.created',
  'refund.succeeded',
  'refund.failed',
  'dispute.opened',
  'dispute.evidence_submitted',
  'dispute.closed',
  'settlement.batch_closed',
  'settlement.item_settled',
  'settlement.completed',
  'settlement.reconciliation_failed',
  'settlement.duplicate_detected',
  'settlement.variance_detected',
  'settlement.funded',
  'payout.scheduled',
  'payout.paid',
  'payout.failed',
  'payout.returned',
  'ledger.transaction_posted',
  'ledger.imbalance_detected',
  'merchant.created',
  'merchant.updated',
  'merchant.status_changed',
  'merchant.bank_account_verified',
  'invoice.issued',
] as const;
