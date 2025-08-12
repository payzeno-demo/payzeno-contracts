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
}
export type PaymentAuthorizedEvent = EventEnvelope<'payment.authorized', PaymentAuthorizedPayload>;

export type PaymentCapturedEvent = EventEnvelope<'payment.captured', PaymentCapturedPayload>;

export type PaymentFailedEvent = EventEnvelope<'payment.failed', PaymentFailedPayload>;

export type PaymentCanceledEvent = EventEnvelope<'payment.canceled', PaymentCanceledPayload>;

export type RefundCreatedEvent = EventEnvelope<'refund.created', RefundCreatedPayload>;

export type RefundFailedEvent = EventEnvelope<'refund.failed', RefundFailedPayload>;

export type DisputeOpenedEvent = EventEnvelope<'dispute.opened', DisputeOpenedPayload>;

export interface DisputeEvidenceSubmittedPayload {
  dispute_id: DisputeId;
  merchant_id: MerchantId;
  submitted_at: IsoTimestamp;
  evidence_field_count: number;
}
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
