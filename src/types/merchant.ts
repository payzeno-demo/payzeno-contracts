/**
 * Merchant, User, ApiKey, BankAccount — the payzeno-api-owned tenant surface.
 */

import type { ApiKeyMode, PricingModel } from './enums';
import type { Paginated } from './errors.types';
import type {
  ApiKeyId,
  BankAccountId,
  BasisPoints,
  CurrencyCode,
  IsoTimestamp,
  MerchantId,
  Metadata,
  MinorUnits,
  UserId,
} from './scalars';

export const MERCHANT_STATUSES = [
  'pending_review',
  'active',
  'restricted',
  'suspended',
  'rejected',
  'closed',
] as const;
export interface CreateApiKeyRequest {
  name: string;
  mode: ApiKeyMode;
  /** Defaults to every read scope. */
  scopes?: ApiKeyScope[];
}

