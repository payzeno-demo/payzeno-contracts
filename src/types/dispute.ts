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
export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export interface DisputeEvidence {
  product_description?: string;
  customer_name?: string;
  customer_email?: string;
  shipping_tracking_number?: string;
  receipt_file_id?: string;
  service_documentation_file_id?: string;
  uncategorized_text?: string;
}

export interface Dispute {
  id: DisputeId;
  object: 'dispute';
  merchant_id: MerchantId;
  charge_id: ChargeId;
  amount_minor: MinorUnits;
  fee_minor: MinorUnits;
  currency: CurrencyCode;
  status: DisputeStatus;
  reason: DisputeReason;
  network_reason_code: string;
  evidence_due_by: IsoTimestamp | null;
  evidence: DisputeEvidence;
  is_charge_refundable: boolean;
  /**
   * Copied from `charge.three_d_secure.liability_shifted` at dispute creation. When true and
   * `reason === 'fraudulent'` the issuer bears the loss, not the merchant — which changes the
   * §5 lifecycle's default outcome and whether evidence is worth gathering at all.
   */
  liability_shifted: boolean;
  submitted_at: IsoTimestamp | null;
  resolved_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
}

export interface SubmitDisputeEvidenceRequest {
  evidence: DisputeEvidence;
  /** When false the evidence is staged but not sent to the network. */
  submit?: boolean;
}

export type DisputeResponse = Dispute;
export type DisputeListResponse = Paginated<Dispute>;
