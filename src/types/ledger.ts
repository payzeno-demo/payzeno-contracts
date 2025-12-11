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
] as const;
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

export type LedgerPurpose = (typeof LEDGER_PURPOSES)[number];

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

export interface PostTransactionLine {
  account_type: AccountType;
  direction: EntryDirection;
  amount_minor: MinorUnits;
}
