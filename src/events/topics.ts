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
