/** Payouts — money leaving Payzeno for a merchant's bank account. */

import type { Paginated } from './errors.types';
import type {
  BankAccountId,
  CurrencyCode,
  IsoDate,
  IsoTimestamp,
  LedgerTransactionId,
  MerchantId,
  MinorUnits,
  PayoutId,
} from './scalars';

export const PAYOUT_STATUSES = [
  'scheduled',
  'in_transit',
  'paid',
  'failed',
  'returned',
  'canceled',
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_METHODS = [
  'standard_ach',
  'same_day_ach',
  'sepa',
  'faster_payments',
  /** Pulls funds FROM the merchant when their balance has gone negative. */
  'debit_ach',
] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const PAYOUT_FAILURE_CODES = [
  'account_closed',
  'no_account',
  'invalid_details',
  'debit_not_authorized',
  'insufficient_funds',
  'bank_rejected',
] as const;
export type PayoutFailureCode = (typeof PAYOUT_FAILURE_CODES)[number];

export interface Payout {
  id: PayoutId;
  object: 'payout';
  merchant_id: MerchantId;
  bank_account_id: BankAccountId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  status: PayoutStatus;
  method: PayoutMethod;
  available_on: IsoDate;
  arrival_estimate: IsoDate | null;
  statement_descriptor: string;
  failure_code: PayoutFailureCode | null;
  ledger_transaction_id: LedgerTransactionId | null;
  /**
   * The `payout_reversal` transaction. Required on `failed` and `returned` — without it an
   * ACH failure permanently destroys the merchant's money (domain-model.md §7, §9).
   */
  reversal_transaction_id: LedgerTransactionId | null;
  livemode: boolean;
  initiated_at: IsoTimestamp | null;
  paid_at: IsoTimestamp | null;
  failed_at: IsoTimestamp | null;
  returned_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
}

export interface CreatePayoutRequest {
  amount_minor?: MinorUnits;
  currency: CurrencyCode;
  /**
   * Optional; defaults to the merchant's `is_default` account **for this currency**. The
   * account's `currency` must equal `currency` — Payzeno does not convert (domain-model §0.1).
   * Mismatch is `BankAccountUnusableError`.
   */
  bank_account_id?: BankAccountId;
  method?: PayoutMethod;
  statement_descriptor?: string;
}

export type PayoutResponse = Payout;
export type PayoutListResponse = Paginated<Payout>;
