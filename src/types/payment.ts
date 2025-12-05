/**
 * PaymentIntent, Charge, and the tokenised card surface.
 *
 * dhotfix: there is no field in this module that can hold a PAN, a CVV or
 * a first-six, and there will not be one. PAY-1861. If a request needs card
 * data it goes to the vault and comes back as a `pmt_` token.
 */

import type { CardFunding } from './enums';
import type { ListQuery, Paginated } from './errors.types';
import type {
  ChargeId,
  CurrencyCode,
  IsoTimestamp,
  MerchantId,
  Metadata,
  MinorUnits,
  PaymentIntentId,
  SettlementBatchId,
} from './scalars';
import type { Acquirer } from './settlement';

export const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'discover'] as const;
export type CaptureMethod = (typeof CAPTURE_METHODS)[number];

export interface PaymentIntent {
  id: PaymentIntentId;
  object: 'payment_intent';
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  status: PaymentIntentStatus;
  capture_method: CaptureMethod;
  customer_reference: string | null;
  description: string | null;
  statement_descriptor: string | null;
  latest_charge_id: ChargeId | null;
  /**
   * Browser-side bearer credential. Its only holder is the merchant's checkout page, and the
   * only routes it can reach are the `client-secret`-auth ones in api-surface.md §1.2.
   */
  client_secret: string;
  /** Set exactly when `status === 'requires_action'`. */
  next_action: NextAction | null;
  livemode: boolean;
  metadata: Metadata;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  canceled_at: IsoTimestamp | null;
  cancellation_reason: CancellationReason | null;
}

export interface CreatePaymentIntentRequest {
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  capture_method?: CaptureMethod;
  payment_method_token?: PaymentMethodToken;
  customer_reference?: string;
  description?: string;
  statement_descriptor?: string;
  /** When true and a payment method is supplied, confirm in the same call. */
  confirm?: boolean;
  metadata?: Metadata;
}

export interface ConfirmPaymentIntentRequest {
  payment_method_token?: PaymentMethodToken;
  /** 3DS / redirect return target. */
  return_url?: string;
}

export interface Charge {
  id: ChargeId;
  object: 'charge';
  merchant_id: MerchantId;
  payment_intent_id: PaymentIntentId;
  amount_minor: MinorUnits;
  captured_amount_minor: MinorUnits;
  refunded_amount_minor: MinorUnits;
  currency: CurrencyCode;
  status: ChargeStatus;
  /**
   * The ONE name for the card fields. The DB flattens this to `card_brand`, `card_last_four`,
   * `card_exp_month`, `card_exp_year`, `card_country`, `card_funding` (data-model.md §1.6);
   * the API and every consumer use the nested object. There is no `payment_method_brand`.
   */
  card: CardSummary;
  /** Which acquirer authorised it. Part of `uq_charge_processor_reference`. */
  acquirer: Acquirer;
  network_transaction_id: string | null;
  processor_reference: string | null;
  authorization_code: string | null;
  capture_method: CaptureMethod;
  three_d_secure: ThreeDSecureResult | null;
  sca_exemption: ScaExemption | null;
  risk_score: number;
  failure_code: DeclineCode | null;
  failure_message: string | null;
  settlement_batch_id: SettlementBatchId | null;
  livemode: boolean;
  metadata: Metadata;
  authorized_at: IsoTimestamp | null;
  captured_at: IsoTimestamp | null;
  settled_at: IsoTimestamp | null;
  /** Auth holds expire at 7 days, or 30 for the deferred-capture MCCs. See domain-model §3. */
  authorization_expires_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export type ChargeListResponse = Paginated<Charge>;

