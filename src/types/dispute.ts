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
export interface SubmitDisputeEvidenceRequest {
  evidence: DisputeEvidence;
  /** When false the evidence is staged but not sent to the network. */
  submit?: boolean;
}

