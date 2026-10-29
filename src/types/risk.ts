/**
 * Payment risk reviews. RFC platform-v2 §8.
 *
 * Platform rules run at confirm. A `review` outcome keeps the authorisation uncaptured until a
 * Payzeno risk analyst decides; merchants can see a review but not act on it.
 */

import type {
  ChargeId,
  CurrencyCode,
  IsoTimestamp,
  MerchantId,
  MinorUnits,
  PaymentIntentId,
  ReviewId,
  StaffUserId,
} from './scalars';

export const RISK_OUTCOMES = ['allow', 'review', 'block'] as const;
export type RiskOutcome = (typeof RISK_OUTCOMES)[number];

export const RISK_RULES = [
  'high_acquirer_score',
  'very_high_acquirer_score',
  'country_mismatch',
  'card_velocity',
  'ip_velocity',
  'amount_spike',
  'new_merchant_large_amount',
] as const;
export type RiskRule = (typeof RISK_RULES)[number];

export const REVIEW_STATUSES = ['open', 'approved', 'declined'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface Review {
  id: ReviewId;
  object: 'review';
  merchant_id: MerchantId;
  payment_intent_id: PaymentIntentId;
  charge_id: ChargeId;
  status: ReviewStatus;
  rules: RiskRule[];
  risk_score: number;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  /** Shopper's country from the edge, or null when unknown. */
  ip_country: string | null;
  card_country: string | null;
  opened_at: IsoTimestamp;
  closed_at: IsoTimestamp | null;
  closed_by: StaffUserId | null;
  note: string | null;
  livemode: boolean;
}

export interface ReviewDecisionRequest {
  note?: string;
}

export interface ReviewListQuery {
  status?: ReviewStatus;
  merchant_id?: MerchantId;
  cursor?: string;
  limit?: number;
}
