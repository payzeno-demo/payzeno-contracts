/**
 * Recurring billing for a merchant's own customers. RFC platform-v2 §6.
 *
 * Not to be confused with billing-legacy's `sub_` subscriptions, which are how Payzeno bills
 * merchants. These are `csub_`: a merchant charging *their* customers every month.
 */

import type {
  CurrencyCode,
  CustomerId,
  IsoTimestamp,
  MerchantId,
  Metadata,
  MinorUnits,
  PaymentIntentId,
  PaymentMethodId,
  PriceId,
  SubscriptionId,
} from './scalars';

export const RECURRING_INTERVALS = ['month', 'year'] as const;
export type RecurringInterval = (typeof RECURRING_INTERVALS)[number];

export interface Recurring {
  interval: RecurringInterval;
  interval_count: number;
}

export interface Price {
  id: PriceId;
  object: 'price';
  merchant_id: MerchantId;
  product_name: string;
  unit_amount_minor: MinorUnits;
  currency: CurrencyCode;
  /** Null for a one-off price. Only recurring prices can start a subscription. */
  recurring: Recurring | null;
  active: boolean;
  livemode: boolean;
  metadata: Metadata;
  created_at: IsoTimestamp;
}

export interface CreatePriceRequest {
  product_name: string;
  unit_amount_minor: MinorUnits;
  currency: CurrencyCode;
  recurring?: Recurring;
  metadata?: Metadata;
}

export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'canceled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface Subscription {
  id: SubscriptionId;
  object: 'subscription';
  merchant_id: MerchantId;
  customer_id: CustomerId;
  price_id: PriceId;
  status: SubscriptionStatus;
  current_period_start: IsoTimestamp;
  current_period_end: IsoTimestamp;
  cancel_at_period_end: boolean;
  canceled_at: IsoTimestamp | null;
  default_payment_method_id: PaymentMethodId | null;
  latest_payment_intent_id: PaymentIntentId | null;
  /** When `past_due`: the next automatic retry, or null after the last one. */
  next_retry_at: IsoTimestamp | null;
  /** Failed renewal attempts in the current period. */
  failed_attempts: number;
  livemode: boolean;
  metadata: Metadata;
  created_at: IsoTimestamp;
}

export interface CreateSubscriptionRequest {
  customer_id: CustomerId;
  price_id: PriceId;
  /** Defaults to the customer's default payment method. */
  payment_method_id?: PaymentMethodId;
  metadata?: Metadata;
}

export interface CancelSubscriptionRequest {
  /** Default true: runs to the end of the paid period. */
  at_period_end?: boolean;
}

export interface SubscriptionListQuery {
  customer_id?: CustomerId;
  status?: SubscriptionStatus;
  cursor?: string;
  limit?: number;
}
