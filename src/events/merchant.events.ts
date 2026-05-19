/**
 * Merchant — published by payzeno-api on `payzeno-merchant-events`.
 *
 * Two consumers, and they need opposite things: payzeno-ledger builds
 * `merchant_projection` from these (so every NOT NULL column must be in the
 * payload) and payzeno-billing-legacy builds `MerchantBillingProfile` from them
 * (so the fee fields must be in the payload). The union of those two is what is
 * here. Nothing in it is optional, on purpose — a projection cannot be filled
 * from a diff it never received.
 */

import type {
  BankAccountId,
  CurrencyCode,
  IsoTimestamp,
  MerchantId,
  MerchantStatus,
  MinorUnits,
} from '../index';
import type { EventEnvelope } from './envelope';

/**
 * Must carry every NOT NULL column of `merchant_projection` (data-model.md §3.8). It
 * previously omitted status, risk_tier, reserve_bps, payout_schedule and
 * capture_at_settlement, so the projection could not be populated at all.
 */
export interface MerchantCreatedPayload {
  merchant_id: MerchantId;
  legal_name: string;
  display_name: string;
  country: string;
  default_currency: CurrencyCode;
  mcc: string;
  status: MerchantStatus;
  risk_tier: string;
  payout_schedule: string;
  pricing_model: string;
  reserve_bps: number;
  reserve_hold_days: number;
  payout_delay_days: number;
  settlement_tolerance_minor: MinorUnits;
  capture_at_settlement: boolean;
  platform_fee_bps: number;
  platform_fee_fixed_minor: MinorUnits;
  created_at: IsoTimestamp;
}
export type MerchantUpdatedEvent = EventEnvelope<'merchant.updated', MerchantUpdatedPayload>;

export interface MerchantStatusChangedPayload {
  merchant_id: MerchantId;
  previous_status: MerchantStatus;
  status: MerchantStatus;
  reason: string;
  changed_by: string;
  changed_at: IsoTimestamp;
}
export type MerchantStatusChangedEvent = EventEnvelope<
  'merchant.status_changed',
  MerchantStatusChangedPayload
>;

/**
 * Feeds `bank_account_projection` in the ledger (data-model.md §3.11). `payout` carries
 * `bank_account_id not null` and `PayoutInitiator.initiate` must produce an ACH/SEPA/FPS
 * instruction — but BankAccount is owned by payzeno-api and there is no ledger→api route on
 * the payout path. Without the fields below the ledger holds an id it cannot resolve, and
 * `CreatePayoutRequest.bank_account_id` being optional means it also cannot find the default.
 */
