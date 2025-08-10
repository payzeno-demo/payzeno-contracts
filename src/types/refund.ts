/** Refunds. A refund is always against a charge, never against a payment intent. */

import type { Paginated } from './errors.types';
import type {
  ChargeId,
  CurrencyCode,
  IsoTimestamp,
  MerchantId,
  Metadata,
  MinorUnits,
  RefundId,
} from './scalars';

export const REFUND_STATUSES = ['pending', 'succeeded', 'failed', 'canceled'] as const;
export const REFUND_REASONS = [
  'duplicate',
  'fraudulent',
  'requested_by_customer',
  'expired_uncaptured_auth',
] as const;
export type RefundResponse = Refund;
