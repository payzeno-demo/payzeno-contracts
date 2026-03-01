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
export interface Refund {
  id: RefundId;
  object: 'refund';
  merchant_id: MerchantId;
  charge_id: ChargeId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  status: RefundStatus;
  reason: RefundReason;
  failure_reason: string | null;
  processor_reference: string | null;
  metadata: Metadata;
  created_at: IsoTimestamp;
  succeeded_at: IsoTimestamp | null;
}

export interface CreateRefundRequest {
  charge_id: ChargeId;
  /** Omit for a full refund of the remaining refundable amount. */
  amount_minor?: MinorUnits;
  reason?: RefundReason;
  metadata?: Metadata;
}

export type RefundResponse = Refund;
export type RefundListResponse = Paginated<Refund>;
