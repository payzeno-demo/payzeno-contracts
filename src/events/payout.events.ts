/**
 * Payouts — published by payzeno-ledger on `payzeno-ledger-events`.
 *
 * `payout.failed` is the one event that reaches a human in near-real time: it is
 * relayed to the console over `/ws/notifications` by payzeno-api's
 * NotificationRelayConsumer. Anything the merchant has to ACT on belongs in the
 * payload, because the relay does not enrich.
 */

import type {
  BankAccountId,
  CurrencyCode,
  IsoDate,
  IsoTimestamp,
  LedgerTransactionId,
  MerchantId,
  MinorUnits,
  PayoutFailureCode,
  PayoutId,
  PayoutMethod,
} from '../index';
import type { EventEnvelope } from './envelope';

export interface PayoutScheduledPayload {
  payout_id: PayoutId;
  merchant_id: MerchantId;
  bank_account_id: BankAccountId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  method: PayoutMethod;
  available_on: IsoDate;
  scheduled_at: IsoTimestamp;
}
export type PayoutScheduledEvent = EventEnvelope<'payout.scheduled', PayoutScheduledPayload>;

export interface PayoutPaidPayload {
  payout_id: PayoutId;
  merchant_id: MerchantId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  ledger_transaction_id: LedgerTransactionId;
  paid_at: IsoTimestamp;
}
export type PayoutPaidEvent = EventEnvelope<'payout.paid', PayoutPaidPayload>;

/** Consumed by payzeno-console (via the notification relay) and payzeno-api. */
export interface PayoutFailedPayload {
  payout_id: PayoutId;
  merchant_id: MerchantId;
  bank_account_id: BankAccountId;
  amount_minor: MinorUnits;
  currency: CurrencyCode;
  failure_code: PayoutFailureCode;
