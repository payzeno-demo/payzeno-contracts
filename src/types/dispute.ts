/** Chargebacks and their evidence packets. */

import type { Paginated } from './errors.types';
import type {
  ChargeId,
  CurrencyCode,
  DisputeId,
  IsoTimestamp,
  MerchantId,
  MinorUnits,
} from './scalars';

export const DISPUTE_STATUSES = [
  'needs_response',
  'under_review',
  'won',
  'lost',
  'warning_needs_response',
  'warning_closed',
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_REASONS = [
  'fraudulent',
  'product_not_received',
  'product_unacceptable',
  'duplicate',
  'subscription_canceled',
  'credit_not_processed',
  'general',
] as const;
export interface DisputeEvidence {
  product_description?: string;
  customer_name?: string;
  customer_email?: string;
  shipping_tracking_number?: string;
  receipt_file_id?: string;
  service_documentation_file_id?: string;
  uncategorized_text?: string;
}

export interface SubmitDisputeEvidenceRequest {
  evidence: DisputeEvidence;
  /** When false the evidence is staged but not sent to the network. */
  submit?: boolean;
}

export type DisputeResponse = Dispute;
