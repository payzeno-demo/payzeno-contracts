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
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

export const RISK_TIERS = ['standard', 'elevated', 'high'] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export interface CreateMerchantRequest {
  legal_name: string;
  display_name: string;
  country: string;
  default_currency: CurrencyCode;
  mcc: string;
  payout_schedule?: PayoutSchedule;
  metadata?: Metadata;
}

export const API_KEY_SCOPES = [
  'merchants:read',
  'payment_intents:read',
  'payment_intents:write',
  'charges:read',
  'refunds:read',
  'refunds:write',
  'disputes:read',
  'disputes:write',
  'balance:read',
  'payouts:read',
  'payouts:write',
  'settlements:read',
  'invoices:read',
  'webhooks:read',
  'webhooks:write',
] as const;
export interface CreateApiKeyRequest {
  name: string;
  mode: ApiKeyMode;
  /** Defaults to every read scope. */
  scopes?: ApiKeyScope[];
}

export const BANK_ACCOUNT_STATUSES = [
  'new',
  'validated',
  'verification_failed',
  'errored',
] as const;
/** Which rail's coordinates a bank account carries. Drives validation and payout method. */
export const BANK_ACCOUNT_SCHEMES = ['aba', 'iban', 'uk_sort_code'] as const;
export interface CreateBankAccountRequest {
  country: string;
  currency: CurrencyCode;
  scheme: BankAccountScheme;
  /** Opaque vault token, `bat_` prefixed. Payzeno never sees the account number. */
  bank_account_token: string;
  account_holder_name: string;
  is_default?: boolean;
}
