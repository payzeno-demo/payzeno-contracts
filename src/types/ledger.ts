/**
 * The double-entry chart of accounts, transactions, entries and balances.
 * Owned by payzeno-ledger; payzeno-api reads it through the internal API.
 */

import type { EntryDirection, LedgerActor, LedgerReferenceType } from './enums';
import type {
  AccountId,
  CurrencyCode,
  IsoTimestamp,
  LedgerEntryId,
  LedgerTransactionId,
  MerchantId,
  MinorUnits,
} from './scalars';

export const ACCOUNT_TYPES = [
  'processor_clearing',
  'merchant_receivable',
  /** Contra to merchant_receivable; carries the outstanding authorisation hold. */
  'authorization_hold',
  'merchant_payable',
  'platform_fee_revenue',
  /**
   * Interchange and scheme fees are money Payzeno PAYS the networks — roughly 80% of a card
   * acquirer's fee line. Crediting the whole acquirer fee to platform_fee_revenue overstates
   * gross revenue by exactly that much. These three are debit-normal expense accounts.
   */
  'interchange_expense',
  'scheme_fee_expense',
  'acquirer_fee_expense',
  'reserve',
  'chargeback_liability',
  'cash',
  'rounding_adjustment',
  /**
   * RFC platform-v2 §7, ledger migration 0035. A converted payout crosses currencies through
   * fx_clearing (debit-normal, one per currency); the spread over mid lands in fx_revenue.
   */
  'fx_clearing',
  'fx_revenue',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = ['active', 'frozen', 'closed'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface Account {
  id: AccountId;
  object: 'account';
  merchant_id: MerchantId | null;
  type: AccountType;
  currency: CurrencyCode;
  normal_balance: EntryDirection;
  status: AccountStatus;
  livemode: boolean;
  created_at: IsoTimestamp;
}

export const LEDGER_PURPOSES = [
  'auth',
  'auth_release',
  'capture',
  'settle',
  /** Batch-level funding: cash actually arrived. Posted only against a matched funding_event. */
  'settlement_funding',
  /**
   * NON-transactional fees only — dispute fees, monthly minimums, account fees. The per-charge
   * processing fee is booked by `capture` and never here; booking it twice double-counts both
   * Payzeno's revenue and the merchant's payable deduction. See domain-model.md §7.
   */
  'fee',
  'refund',
  'dispute',
  'reserve_release',
  'payout',
  'payout_reversal',
  'reversal',
  'adjustment',
] as const;
export type LedgerPurpose = (typeof LEDGER_PURPOSES)[number];

export interface LedgerEntry {
  id: LedgerEntryId;
  object: 'ledger_entry';
  transaction_id: LedgerTransactionId;
  account_id: AccountId;
  direction: EntryDirection;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  sequence: number;
  created_at: IsoTimestamp;
}

export interface LedgerTransaction {
  id: LedgerTransactionId;
  object: 'ledger_transaction';
  idempotency_key: string;
  /** sha256 over the canonicalised request minus `idempotency_key`. Added by migration 0020. */
  request_fingerprint: string;
  purpose: LedgerPurpose;
  merchant_id: MerchantId | null;
  currency: CurrencyCode;
  livemode: boolean;
  reference_type: LedgerReferenceType;
  reference_id: string;
  reverses_transaction_id: LedgerTransactionId | null;
  created_by: LedgerActor;
  entries: LedgerEntry[];
  posted_at: IsoTimestamp;
}

export interface BalanceBucket {
  type: AccountType;
  amount_minor: MinorUnits;
}

export interface Balance {
  object: 'balance';
  merchant_id: MerchantId;
  currency: CurrencyCode;
  /** Settled, funded and payable right now. Never negative — see `negative_balance_minor`. */
  available_minor: MinorUnits;
  /** Authorised or captured but not yet settled. */
  pending_minor: MinorUnits;
  reserved_minor: MinorUnits;
  disputed_minor: MinorUnits;
  /**
   * How much the merchant owes Payzeno. Positive when refunds and chargebacks have driven
   * `merchant_payable` into a debit balance and there is no incoming volume to absorb it.
   * The primary source of credit loss for a B2B acquirer, and the console must show it.
   */
  negative_balance_minor: MinorUnits;
  buckets: BalanceBucket[];
  as_of: IsoTimestamp;
}

/** Internal ledger posting request — payzeno-api → payzeno-ledger. */
export interface PostTransactionRequest {
  idempotency_key: string;
  purpose: LedgerPurpose;
  merchant_id: MerchantId | null;
  currency: CurrencyCode;
  livemode: boolean;
  reference_type: LedgerReferenceType;
  reference_id: string;
  lines: PostTransactionLine[];
}

export interface PostTransactionLine {
  account_type: AccountType;
  direction: EntryDirection;
  amount_minor: MinorUnits;
}
