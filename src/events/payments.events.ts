/**
 * Payments — published by payzeno-api on `payzeno-payments-events`.
 *
 * Consumers: payzeno-ledger's PaymentEventConsumer (posts the auth /
 * capture / refund legs), payzeno-api's own WebhookFanoutConsumer, and the
 * notification relay for `dispute.opened`.
 */

import type {
  Acquirer,
  CardBrand,
  ChargeId,
  CurrencyCode,
  DeclineCode,
  DisputeId,
  DisputeReason,
  IsoTimestamp,
  LedgerTransactionId,
  MerchantId,
  MinorUnits,
  BasisPoints,
  PaymentIntentId,
  RefundId,
  ReviewId,
  SubscriptionId,
} from '../index';
import type { EventEnvelope } from './envelope';

export interface PaymentAuthorizedPayload {
  charge_id: ChargeId;
  payment_intent_id: PaymentIntentId;
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  capture_method: 'automatic' | 'manual';
  /** True when payzeno-ledger, not payzeno-api, will issue the capture at settlement. */
  capture_at_settlement: boolean;
  card_brand: CardBrand;
  card_last_four: string;
  authorization_code: string;
  network_transaction_id: string;
  /**
   * Both fields below are additive (no version bump) and both are REQUIRED by the ledger's
   * `settlement_charge` projection: `reserve_bps not null default 0` is denormalised at
   * authorisation time, and `SettlementPoster` feeds it into `PostingContext` to drive the
   * `reserve` leg of every settle posting. Without them the whole reserve path is
   * unreachable and `processor_reference` — the primary reconciliation match key — has no
   * source. See data-model.md §3.8.
   */
  reserve_bps: BasisPoints;
  processor_reference: string;
  acquirer: Acquirer;
  risk_score: number;
  authorized_at: IsoTimestamp;
  /**
   * RFC platform-v2 §8, additive: set when Payzeno's risk rules held the payment for review —
   * the authorisation stays uncaptured until a risk analyst decides. Null or absent otherwise.
   */
  review_id?: ReviewId | null;
}
export type PaymentAuthorizedEvent = EventEnvelope<'payment.authorized', PaymentAuthorizedPayload>;

export interface PaymentCapturedPayload {
  charge_id: ChargeId;
  payment_intent_id: PaymentIntentId;
  merchant_id: MerchantId;
  captured_amount_minor: MinorUnits;
  authorized_amount_minor: MinorUnits;
  currency: CurrencyCode;
  captured_at: IsoTimestamp;
  /** RFC platform-v2 §6, additive: the subscription this payment was for (first or renewal). */
  subscription_id?: SubscriptionId | null;
}
export type PaymentCapturedEvent = EventEnvelope<'payment.captured', PaymentCapturedPayload>;

export interface PaymentFailedPayload {
  charge_id: ChargeId | null;
  payment_intent_id: PaymentIntentId;
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  failure_code: DeclineCode;
  failure_message: string;
  retryable: boolean;
  failed_at: IsoTimestamp;
  /** RFC platform-v2 §6, additive: set when a subscription payment (first or renewal) failed. */
  subscription_id?: SubscriptionId | null;
}
export type PaymentFailedEvent = EventEnvelope<'payment.failed', PaymentFailedPayload>;

export interface PaymentCanceledPayload {
  payment_intent_id: PaymentIntentId;
  charge_id: ChargeId | null;
  merchant_id: MerchantId;
  released_amount_minor: MinorUnits;
  currency: CurrencyCode;
  cancellation_reason: string;
  canceled_at: IsoTimestamp;
}
export type PaymentCanceledEvent = EventEnvelope<'payment.canceled', PaymentCanceledPayload>;

export interface RefundCreatedPayload {
  refund_id: RefundId;
  charge_id: ChargeId;
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  reason: string;
  /** True when the underlying charge has not settled; the refund nets into the batch. */
  nets_against_settlement: boolean;
  created_at: IsoTimestamp;
}
export type RefundCreatedEvent = EventEnvelope<'refund.created', RefundCreatedPayload>;

export interface RefundSucceededPayload {
  refund_id: RefundId;
  charge_id: ChargeId;
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  succeeded_at: IsoTimestamp;
}
export type RefundSucceededEvent = EventEnvelope<'refund.succeeded', RefundSucceededPayload>;

export interface RefundFailedPayload {
  refund_id: RefundId;
  charge_id: ChargeId;
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  failure_reason: string;
  failed_at: IsoTimestamp;
}
export type RefundFailedEvent = EventEnvelope<'refund.failed', RefundFailedPayload>;

export interface DisputeOpenedPayload {
  dispute_id: DisputeId;
  charge_id: ChargeId;
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  fee_minor: MinorUnits;
  currency: CurrencyCode;
  reason: DisputeReason;
  network_reason_code: string;
  evidence_due_by: IsoTimestamp;
  opened_at: IsoTimestamp;
}
export type DisputeOpenedEvent = EventEnvelope<'dispute.opened', DisputeOpenedPayload>;

export interface DisputeEvidenceSubmittedPayload {
  dispute_id: DisputeId;
  merchant_id: MerchantId;
  submitted_at: IsoTimestamp;
  evidence_field_count: number;
}
export type DisputeEvidenceSubmittedEvent = EventEnvelope<
  'dispute.evidence_submitted',
  DisputeEvidenceSubmittedPayload
>;

export interface DisputeClosedPayload {
  dispute_id: DisputeId;
  charge_id: ChargeId;
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  outcome: 'won' | 'lost' | 'warning_closed';
  /** Set when the outcome reverses the liability posting. */
  reversal_transaction_id: LedgerTransactionId | null;
  closed_at: IsoTimestamp;
}
export type DisputeClosedEvent = EventEnvelope<'dispute.closed', DisputeClosedPayload>;
