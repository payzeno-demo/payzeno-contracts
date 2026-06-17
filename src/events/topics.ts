/**
 * SNS topic → event type routing, and the SQS queue vocabulary.
 *
 * NOTE: these strings must match payzeno-infrastructure envs/*&#47;sns.tf and sqs.tf
 * exactly. There is no test that checks it across repos. Rename at your peril.
 *
 * The mapping is total and disjoint: every member of `EVENT_TYPES` appears on
 * exactly one topic. `src/events.test.ts` asserts both halves of that, because a
 * type on no topic is an event nobody can subscribe to and a type on two topics
 * is a duplicate delivery every consumer must then dedupe by hand.
 */

import type { EventType } from './envelope';

export const EVENT_TOPICS = {
  'payzeno-payments-events': [
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
  ],
  'payzeno-ledger-events': [
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
  ],
  'payzeno-merchant-events': [
    'merchant.created',
    'merchant.updated',
    'merchant.status_changed',
    'merchant.bank_account_verified',
  ],
  /** The only topic payzeno-billing-legacy publishes on — its single EMITS surface. */
  'payzeno-billing-events': ['invoice.issued'],
} as const satisfies Record<string, readonly EventType[]>;

export type TopicName = keyof typeof EVENT_TOPICS;

/**
 * The redrive target. Not in `EVENT_TOPICS` because it carries no event type of
 * its own — anything can land on it, which is the point.
 */
export const DLQ_TOPIC_NAME = 'payzeno-dlq';

/**
 * Every SQS queue subscribed to the topics above, keyed by the consumer class
 * that drains it. The values are the literal queue names.
 *
 * `payzeno-console-notifications` is consumed by payzeno-API's
 * NotificationRelayConsumer, which fans out over `/ws/notifications`. The
 * console is a socket client, not a queue consumer — it has no AWS credentials
 * and never will. That queue subscribes to TWO topics (payments for
 * `dispute.opened`, ledger for `payout.failed` / `settlement.completed`).
 */
export const QUEUE_NAMES = {
  PaymentEventConsumer: 'payzeno-ledger-payments',
  MerchantEventConsumer: 'payzeno-ledger-merchants',
  LedgerEventsConsumer: 'payzeno-api-ledger',
  WebhookFanoutConsumer: 'payzeno-api-webhooks',
  NotificationRelayConsumer: 'payzeno-console-notifications',
  InvoiceProjectionConsumer: 'payzeno-api-billing',
