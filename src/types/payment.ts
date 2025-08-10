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

