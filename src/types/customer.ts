/**
 * A merchant's customers and their saved cards. RFC platform-v2 §5.
 *
 * A `PaymentMethod` wraps a reusable vault token. The token itself is never returned: a
 * saved card is referenced by `pm_` id everywhere outside payzeno-api.
 */

import type { CardSummary } from './payment';
import type {
  CustomerId,
  IsoTimestamp,
  MerchantId,
  Metadata,
  PaymentMethodId,
} from './scalars';

export interface Customer {
  id: CustomerId;
  object: 'customer';
  merchant_id: MerchantId;
  email: string | null;
  name: string | null;
  default_payment_method_id: PaymentMethodId | null;
  livemode: boolean;
  metadata: Metadata;
  created_at: IsoTimestamp;
}

export interface CreateCustomerRequest {
  email?: string;
  name?: string;
  metadata?: Metadata;
}

export interface UpdateCustomerRequest {
  email?: string;
  name?: string;
  default_payment_method_id?: PaymentMethodId;
  metadata?: Metadata;
}

export interface PaymentMethod {
  id: PaymentMethodId;
  object: 'payment_method';
  customer_id: CustomerId;
  card: CardSummary;
  livemode: boolean;
  created_at: IsoTimestamp;
}

export interface CustomerListQuery {
  email?: string;
  cursor?: string;
  limit?: number;
}
