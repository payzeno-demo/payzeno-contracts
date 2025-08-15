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
export type PayoutResponse = Payout;
