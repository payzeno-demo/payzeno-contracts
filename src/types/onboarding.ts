/**
 * Self-serve signup, KYC onboarding, invites, password reset, and the staff session.
 * RFC: payzeno-wiki/ENG/rfc-platform-v2.md §1, §3, §4.
 *
 * Nothing here carries a document's bytes back out to a merchant: uploads are write-only from
 * the merchant's side, and only staff can read a document (through the admin API).
 */

import type { StaffRole } from './auth';
import type { Balance } from './ledger';
import type { BankAccount, Merchant, User } from './merchant';
import type {
  ChargeId,
  CurrencyCode,
  EmailMessageId,
  IsoTimestamp,
  KycDocumentId,
  MerchantId,
  StaffUserId,
} from './scalars';

// -- signup ---------------------------------------------------------------------------------

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  legal_name: string;
  display_name: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  default_currency: CurrencyCode;
}

export interface SignupResponse {
  object: 'signup';
  merchant_id: MerchantId;
  /** Always true: the owner must click the emailed link before they can log in. */
  verification_required: true;
}

export interface VerifyEmailRequest {
  token: string;
}

// -- invites and password reset ---------------------------------------------------------------

export interface AcceptInvitationRequest {
  token: string;
  full_name: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

// -- onboarding / KYC -------------------------------------------------------------------------

export const ONBOARDING_STATES = [
  'collecting',
  'submitted',
  'needs_info',
  'approved',
  'rejected',
] as const;
export type OnboardingState = (typeof ONBOARDING_STATES)[number];

export const BUSINESS_TYPES = ['individual', 'company', 'non_profit'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const KYC_DOCUMENT_TYPES = [
  'identity_document',
  'proof_of_address',
  'company_registration',
  'bank_statement',
] as const;
export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export interface BusinessProfile {
  business_type: BusinessType | null;
  website: string | null;
  product_description: string | null;
  support_email: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  /** Registration / tax number. */
  registration_number: string | null;
}

export interface Representative {
  full_name: string | null;
  date_of_birth: string | null;
  email: string | null;
}

export interface KycDocument {
  id: KycDocumentId;
  object: 'kyc_document';
  merchant_id: MerchantId;
  type: KycDocumentType;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: IsoTimestamp;
}

/** What is still missing before `submit` is allowed. Empty array = ready. */
export const ONBOARDING_REQUIREMENTS = [
  'business_profile',
  'representative',
  'bank_account',
  'identity_document',
] as const;
export type OnboardingRequirement = (typeof ONBOARDING_REQUIREMENTS)[number];

export interface Onboarding {
  object: 'onboarding';
  merchant_id: MerchantId;
  state: OnboardingState;
  business_profile: BusinessProfile;
  representative: Representative;
  documents: KycDocument[];
  requirements_due: OnboardingRequirement[];
  /** Set by staff on `request-info` and `reject`; shown to the merchant verbatim. */
  staff_message: string | null;
  submitted_at: IsoTimestamp | null;
  decided_at: IsoTimestamp | null;
}

export interface UpdateOnboardingRequest {
  business_profile?: Partial<BusinessProfile>;
  representative?: Partial<Representative>;
}

export interface UploadKycDocumentRequest {
  type: KycDocumentType;
  filename: string;
  content_type: string;
  /** Base64, ≤ 600 KB decoded. */
  content_base64: string;
}

// -- staff ------------------------------------------------------------------------------------

export interface StaffUser {
  id: StaffUserId;
  object: 'staff_user';
  email: string;
  full_name: string;
  role: StaffRole;
}

export interface StaffLoginRequest {
  email: string;
  password: string;
}

export interface StaffSessionResponse {
  object: 'staff_session';
  staff: StaffUser;
}

/** A row in `GET /v1/admin/merchants` (Paginated). */
export interface AdminMerchantSummary {
  object: 'admin_merchant_summary';
  merchant: Merchant;
  onboarding_state: OnboardingState;
  submitted_at: IsoTimestamp | null;
  /** Owner's email, for support lookups. */
  owner_email: string | null;
}

export interface AdminMerchantListQuery {
  status?: Merchant['status'];
  onboarding_state?: OnboardingState;
  q?: string;
  cursor?: string;
  limit?: number;
}

/** `GET /v1/admin/merchants/:id`. */
export interface AdminMerchantDetail {
  object: 'admin_merchant';
  merchant: Merchant;
  onboarding: Onboarding;
  users: User[];
  /**
   * RFC §1 puts these on the detail screen. payzeno-api always sends both; they are optional
   * only so readers written before they were added keep compiling.
   */
  bank_accounts?: BankAccount[];
  /** Live balance in the merchant's default currency. Empty when the ledger could not answer. */
  balances?: Balance[];
}

export interface OnboardingDecisionRequest {
  /** Required for `reject` and `request-info`; shown to the merchant. */
  message?: string;
}

export interface AdminMerchantStatusRequest {
  status: 'active' | 'restricted' | 'suspended';
  reason: string;
}

// -- support tasks (admin) --------------------------------------------------------------------

export const SUPPORT_TASK_KINDS = [
  'duplicate_settlement',
  'ledger_imbalance',
  'settlement_variance',
  'payout_returned',
  'dunning_escalation',
  'manual_review',
] as const;
export type SupportTaskKind = (typeof SUPPORT_TASK_KINDS)[number];

export const SUPPORT_TASK_SEVERITIES = ['low', 'normal', 'high', 'critical'] as const;
export type SupportTaskSeverity = (typeof SUPPORT_TASK_SEVERITIES)[number];

export const SUPPORT_TASK_STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'] as const;
export type SupportTaskStatus = (typeof SUPPORT_TASK_STATUSES)[number];

/** A row in `GET /v1/admin/support-tasks` (Paginated), and `POST .../:id/resolve`. */
export interface SupportTask {
  /** `sup_` — internal to payzeno-api, not in the public prefix table. */
  id: string;
  object: 'support_task';
  merchant_id: MerchantId;
  livemode: boolean;
  kind: SupportTaskKind;
  severity: SupportTaskSeverity;
  status: SupportTaskStatus;
  charge_id: ChargeId | null;
  title: string;
  /** Free text with the facts; what the support agent actually reads. */
  body: string;
  /** Staff id of whoever resolved it. */
  assigned_to: string | null;
  resolved_at: IsoTimestamp | null;
  resolution_note: string | null;
  created_at: IsoTimestamp;
}

export interface ResolveSupportTaskRequest {
  note?: string;
}

// -- email (admin read-only) --------------------------------------------------------------------

export const EMAIL_TEMPLATES = [
  'signup_verify',
  'team_invite',
  'password_reset',
  'onboarding_approved',
  'onboarding_rejected',
  'onboarding_info_requested',
  'dispute_opened',
  'payout_paid',
  'payout_failed',
  'payment_review_opened',
  'receipt',
  'refund_receipt',
  'payment_declined_after_review',
  'subscription_started',
  'subscription_renewed',
  'subscription_payment_failed',
  'subscription_canceled',
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const EMAIL_STATUSES = ['queued', 'sent', 'failed'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export interface EmailMessage {
  id: EmailMessageId;
  object: 'email_message';
  template: EmailTemplate;
  to: string;
  subject: string;
  status: EmailStatus;
  merchant_id: MerchantId | null;
  created_at: IsoTimestamp;
  sent_at: IsoTimestamp | null;
}
