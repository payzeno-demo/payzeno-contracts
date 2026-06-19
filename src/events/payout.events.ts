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
  failure_message: string;
  /**
   * The `payout_reversal` transaction that restored the merchant's balance. Required, not
   * nullable: `failed` is terminal, and without a reversal an ACH failure permanently
   * destroys the merchant's money. Mirrors `PayoutReturnedPayload.reversal_transaction_id`.
   */
  reversal_transaction_id: LedgerTransactionId;
  /** True when the merchant must fix bank details before Payzeno will retry. */
  requires_merchant_action: boolean;
  /** Null when no automatic retry is scheduled. */
  retry_scheduled_for: IsoDate | null;
  failed_at: IsoTimestamp;
}
