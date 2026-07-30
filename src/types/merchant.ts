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

export const PAYOUT_SCHEDULES = ['daily', 'weekly', 'monthly', 'manual'] as const;
export type PayoutSchedule = (typeof PAYOUT_SCHEDULES)[number];

export interface Merchant {
  id: MerchantId;
  object: 'merchant';
  legal_name: string;
  display_name: string;
  country: string;
  default_currency: CurrencyCode;
  status: MerchantStatus;
  mcc: string;
  risk_tier: RiskTier;
  payout_schedule: PayoutSchedule;
  reserve_bps: BasisPoints;
  /** Days a rolling-reserve hold is retained before `reserve_release` frees it. 0 = no reserve. */
  reserve_hold_days: number;
  pricing_model: PricingModel;
  platform_fee_bps: BasisPoints;
  platform_fee_fixed_minor: MinorUnits;
  /** Funds-availability delay in banking days. T+2 standard, T+7 for `high` risk_tier. */
  payout_delay_days: number;
  /** Per-item acquirer-vs-authorised variance tolerated before `variance_exceeded`. */
  settlement_tolerance_minor: MinorUnits;
  /**
   * Deferred capture. This is a COLUMN, not a feature flag — payzeno-api reads
   * `merchant.capture_at_settlement`, payzeno-ledger reads
   * `merchant_projection.capture_at_settlement`. See interfaces.md §8.
   */
  capture_at_settlement: boolean;
  livemode: boolean;
  metadata: Metadata;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface CreateMerchantRequest {
  legal_name: string;
  display_name: string;
  country: string;
  default_currency: CurrencyCode;
  mcc: string;
  payout_schedule?: PayoutSchedule;
  metadata?: Metadata;
}

export interface UpdateMerchantRequest {
  display_name?: string;
  payout_schedule?: PayoutSchedule;
  statement_descriptor?: string;
  /** staff-only fields. A merchant-session PATCH carrying any of these is 403. */
  risk_tier?: RiskTier;
  reserve_bps?: BasisPoints;
  reserve_hold_days?: number;
  payout_delay_days?: number;
  platform_fee_bps?: BasisPoints;
  platform_fee_fixed_minor?: MinorUnits;
  settlement_tolerance_minor?: MinorUnits;
  capture_at_settlement?: boolean;
  metadata?: Metadata;
}

export type MerchantResponse = Merchant;
export type MerchantListResponse = Paginated<Merchant>;

export const USER_ROLES = ['owner', 'admin', 'developer', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: UserId;
  object: 'user';
  merchant_id: MerchantId;
  email: string;
  full_name: string;
  role: UserRole;
  last_login_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
}

/**
 * Scope vocabulary for `api_key.scopes` (migration 19) and `AuthPrincipal.scopes`.
 * `@RequiredScopes(...)` checks against exactly this list. Without it the column has no
 * reader and no guard has anything to check.
 */
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
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export interface ApiKey {
  id: ApiKeyId;
  object: 'api_key';
  merchant_id: MerchantId;
  name: string;
  mode: ApiKeyMode;
  /** `sk_live_` / `sk_test_`. Never `pk_` — that prefix means *publishable* everywhere else. */
  prefix: string;
  last_four: string;
  scopes: ApiKeyScope[];
  created_at: IsoTimestamp;
  revoked_at: IsoTimestamp | null;
}

export interface CreateApiKeyRequest {
  name: string;
  mode: ApiKeyMode;
  /** Defaults to every read scope. */
  scopes?: ApiKeyScope[];
}

/** The plaintext secret is returned exactly once, here, and never again. */
export interface CreateApiKeyResponse extends ApiKey {
  /** Full token: `sk_live_<key_id_suffix>_<secret>`. */
  secret: string;
}

export const BANK_ACCOUNT_STATUSES = [
  'new',
  'validated',
  'verification_failed',
  'errored',
] as const;
export type BankAccountStatus = (typeof BANK_ACCOUNT_STATUSES)[number];

/** Which rail's coordinates a bank account carries. Drives validation and payout method. */
export const BANK_ACCOUNT_SCHEMES = ['aba', 'iban', 'uk_sort_code'] as const;
export type BankAccountScheme = (typeof BANK_ACCOUNT_SCHEMES)[number];

export interface BankAccount {
  id: BankAccountId;
  object: 'bank_account';
  merchant_id: MerchantId;
  country: string;
  currency: CurrencyCode;
  bank_name: string;
  scheme: BankAccountScheme;
  last_four: string;
  /** ABA only. Null for `iban` / `uk_sort_code`. */
  routing_last_four: string | null;
  /** IBAN only. */
  iban_last_four: string | null;
  bic: string | null;
  /** UK only. */
  sort_code_last_four: string | null;
  status: BankAccountStatus;
  is_default: boolean;
  livemode: boolean;
  created_at: IsoTimestamp;
}

/**
 * Bank credentials are tokenised at the vault before they reach payzeno-api, exactly like
 * card data — see domain-model.md §11.3. A 9-digit ABA routing number is not Luhn-valid and
 * is not in the 13-19 digit band, so the PAN redaction rule never caught it: raw numbers
 * went into structured request logs, into `field_errors[].path`, and into APM traces.
 */
export interface CreateBankAccountRequest {
  country: string;
  currency: CurrencyCode;
  scheme: BankAccountScheme;
  /** Opaque vault token, `bat_` prefixed. Payzeno never sees the account number. */
  bank_account_token: string;
  account_holder_name: string;
  is_default?: boolean;
}
