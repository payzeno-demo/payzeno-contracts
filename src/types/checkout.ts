/**
 * Checkout sessions — the Payzeno-hosted payment page and its embeddable iframe.
 *
 * A merchant's server creates a `CheckoutSession` with a secret key. Payzeno creates the
 * PaymentIntent behind it and returns a `url` (hosted: redirect the shopper there) and a
 * `client_secret` (embedded: hand it to `Payzeno.mount()` on the merchant's own page).
 * The shopper's browser only ever talks to `pay.payzeno.com`, which reads the session through
 * `CheckoutSessionPublic` and confirms it with a vault token. Card digits go browser → vault,
 * exactly as on every other surface (ADR 0014); nothing here can hold one.
 *
 * Two shapes on purpose. `CheckoutSession` is what the merchant sees and carries `metadata`
 * and `customer_reference`. `CheckoutSessionPublic` is what the shopper's browser sees and
 * carries neither: whatever is in it is effectively public, because the credential that reads
 * it sits in a URL fragment and in the merchant's page.
 */

import type { Recurring } from './billing';
import type { CardSummary, DeclineCode, NextAction, PaymentIntentStatus } from './payment';
import type { CurrencyOption } from './fx';
import type {
  CheckoutSessionId,
  CurrencyCode,
  CustomerId,
  FxQuoteId,
  IsoTimestamp,
  MerchantId,
  Metadata,
  MinorUnits,
  PaymentIntentId,
  PaymentMethodId,
  PriceId,
  ReviewId,
  SubscriptionId,
} from './scalars';

export const CHECKOUT_SESSION_STATUSES = ['open', 'complete', 'expired'] as const;
export type CheckoutSessionStatus = (typeof CHECKOUT_SESSION_STATUSES)[number];

/**
 * `payment` charges once. `subscription` charges the first period of a recurring price and
 * starts a subscription. `setup` charges nothing and saves a card (used to fix a failed renewal).
 */
export const CHECKOUT_MODES = ['payment', 'subscription', 'setup'] as const;
export type CheckoutMode = (typeof CHECKOUT_MODES)[number];

export const SAVE_PAYMENT_METHOD_OPTIONS = ['optional', 'never'] as const;
export type SavePaymentMethodOption = (typeof SAVE_PAYMENT_METHOD_OPTIONS)[number];

export const CHECKOUT_UI_MODES = ['hosted', 'embedded'] as const;
export type CheckoutUiMode = (typeof CHECKOUT_UI_MODES)[number];

/** Display only. The session amount is authoritative; line items are what the shopper reads. */
export interface CheckoutLineItem {
  name: string;
  quantity: number;
  unit_amount_minor: MinorUnits;
}

export interface CheckoutSession {
  id: CheckoutSessionId;
  object: 'checkout_session';
  merchant_id: MerchantId;
  payment_intent_id: PaymentIntentId;
  status: CheckoutSessionStatus;
  ui_mode: CheckoutUiMode;
  mode: CheckoutMode;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  description: string | null;
  line_items: CheckoutLineItem[];
  customer_id: CustomerId | null;
  price_id: PriceId | null;
  /** Set once a `subscription` session completes, or given for a `setup` session. */
  subscription_id: SubscriptionId | null;
  save_payment_method: SavePaymentMethodOption;
  customer_reference: string | null;
  customer_email: string | null;
  /** Hosted mode: where the page sends the shopper after a successful payment. */
  success_url: string | null;
  /** Hosted mode: the "back to the shop" link. */
  cancel_url: string | null;
  /** Embedded mode: the one origin allowed to frame the checkout. */
  allowed_origin: string | null;
  /** Hosted mode: `https://pay.payzeno.com/c/<id>#<client_secret>`. Null when embedded. */
  url: string | null;
  /**
   * `cs_<ULID>_secret_<random>`. Reads and confirms this one session and nothing else.
   * Lives in the shopper's browser, so treat it as public.
   */
  client_secret: string;
  livemode: boolean;
  metadata: Metadata;
  created_at: IsoTimestamp;
  expires_at: IsoTimestamp;
  completed_at: IsoTimestamp | null;
}

export interface CreateCheckoutSessionRequest {
  /** Required in `payment` mode; derived from the price in `subscription` mode; 0 in `setup`. */
  amount_minor?: MinorUnits;
  currency?: CurrencyCode;
  /** Default `payment`. */
  mode?: CheckoutMode;
  /** `subscription` mode: a recurring price. */
  price_id?: PriceId;
  /** `setup` mode for a failed renewal: the subscription whose card is being replaced. */
  subscription_id?: SubscriptionId;
  customer_id?: CustomerId;
  /** `always` creates a customer from `customer_email` when no `customer_id` is given. */
  customer_creation?: 'if_required' | 'always';
  /** Default `optional` when there is a customer, `never` otherwise. Ignored outside `payment` mode. */
  save_payment_method?: SavePaymentMethodOption;
  /** Default true: offer the shopper's local currency. */
  adaptive_pricing?: boolean;
  ui_mode?: CheckoutUiMode;
  description?: string;
  line_items?: CheckoutLineItem[];
  customer_reference?: string;
  customer_email?: string;
  /** Required when `ui_mode` is `hosted` (the default). */
  success_url?: string;
  cancel_url?: string;
  /** Required when `ui_mode` is `embedded`. Scheme + host (+ port), no path. */
  allowed_origin?: string;
  metadata?: Metadata;
}

/** The most recent failed attempt, so the page can say why and let the shopper retry. */
export interface CheckoutPaymentError {
  /** A `DeclineCode`, or `processing_error` when the failure was not a decline. */
  code: DeclineCode;
  message: string;
}

/** What `pay.payzeno.com` reads. No metadata, no customer reference, no merchant id. */
export interface CheckoutSessionPublic {
  id: CheckoutSessionId;
  object: 'checkout_session_public';
  status: CheckoutSessionStatus;
  ui_mode: CheckoutUiMode;
  mode: CheckoutMode;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  description: string | null;
  line_items: CheckoutLineItem[];
  customer_email: string | null;
  /** Subscription mode: what the shopper is agreeing to repeat. */
  recurring: Recurring | null;
  /** §7: the session currency first, then the shopper's local currency when it differs. Empty when not offered. */
  currency_options: CurrencyOption[];
  /** §5: the customer's saved cards, when the session names a customer. */
  saved_payment_methods: Array<{ id: PaymentMethodId; card: CardSummary }>;
  save_payment_method: SavePaymentMethodOption;
  merchant: {
    display_name: string;
    statement_descriptor: string | null;
  };
  payment: {
    status: PaymentIntentStatus;
    /**
     * The PaymentIntent's client secret — the bearer the vault expects on
     * `POST /public/tokens`. Same exposure as the session secret that fetched it.
     */
    client_secret: string;
    next_action: NextAction | null;
    last_error: CheckoutPaymentError | null;
    /** §8: open while Payzeno reviews the payment. */
    review: { id: ReviewId; status: 'open' | 'approved' | 'declined' } | null;
    /** The currency actually being charged, once confirmed. */
    currency: CurrencyCode;
    amount_minor: MinorUnits;
  };
  success_url: string | null;
  cancel_url: string | null;
  allowed_origin: string | null;
  livemode: boolean;
  expires_at: IsoTimestamp;
}

export interface ConfirmCheckoutSessionRequest {
  /**
   * `pmt_` token from the vault. Omit it only to resume a payment that is waiting on
   * 3-D Secure (`payment.status === 'requires_action'`) after the challenge returns.
   */
  payment_method_token?: string;
  /** Pay with a saved card instead of a new token. */
  payment_method_id?: PaymentMethodId;
  /** Save the new card to the session's customer (when `save_payment_method` is `optional`). */
  save_payment_method?: boolean;
  /** Pay in one of `currency_options`. Must come with that option's quote. */
  currency?: CurrencyCode;
  fx_quote_id?: FxQuoteId;
  /** Where the 3-D Secure challenge returns the shopper. Defaults to the hosted page. */
  return_url?: string;
}
