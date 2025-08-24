/**
 * Outbound webhooks — the merchant-facing projection of the internal bus.
 *
 * `PUBLIC_EVENT_TYPES` is deliberately narrower than `EVENT_TYPES` in
 * `src/events/envelope.ts`, and the two lists are checked against each other in
 * `src/events.test.ts`. This module does not import `EventType`: `types/**` may
 * not reach into `events/**`.
 */

import type { WebhookEndpointStatus } from './enums';
import type { IsoTimestamp, MerchantId, WebhookEventId } from './scalars';

export const WEBHOOK_EVENT_STATUSES = ['pending', 'delivering', 'delivered', 'dead'] as const;
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

/**
 * The merchant-facing event vocabulary — a strict subset of EventType. `enabled_events` is
 * typed against this, and `WebhookFanoutConsumer` (api-surface.md §14) only emits these.
 * Internal bus events (`ledger.*`, `settlement.batch_closed`, `settlement.duplicate_detected`)
 * are never exposed to a merchant.
 */
export const PUBLIC_EVENT_TYPES = [
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
  'settlement.item_settled',
  'settlement.completed',
  'payout.scheduled',
  'payout.paid',
  'payout.failed',
  'payout.returned',
] as const;
export type PublicEventType = (typeof PUBLIC_EVENT_TYPES)[number];

export interface WebhookEndpoint {
  id: string;
  object: 'webhook_endpoint';
  merchant_id: MerchantId;
  url: string;
  enabled_events: PublicEventType[];
  status: WebhookEndpointStatus;
  /** Returned once at creation and once at rotation. Never stored in plaintext. */
  signing_secret?: string;
  /** For display in the console — the stored secret is envelope-encrypted, not hashed. */
  signing_secret_last_four: string;
  /** Both secrets sign during the overlap window; merchants verify against either. */
  rotated_at: IsoTimestamp | null;
  livemode: boolean;
  created_at: IsoTimestamp;
}

export interface WebhookEvent {
  id: WebhookEventId;
  object: 'webhook_event';
  merchant_id: MerchantId;
  endpoint_id: string;
  type: PublicEventType;
  /** The bus `EventEnvelope.id` this was fanned out from. Dedupe key against at-least-once. */
  source_event_id: string;
  payload: Record<string, unknown>;
  status: WebhookEventStatus;
  attempt_count: number;
  next_attempt_at: IsoTimestamp | null;
  last_response_status: number | null;
  last_error: string | null;
  signature_version: 'v1';
  livemode: boolean;
  created_at: IsoTimestamp;
  delivered_at: IsoTimestamp | null;
}

export interface CreateWebhookEndpointRequest {
  url: string;
  enabled_events: PublicEventType[];
}
