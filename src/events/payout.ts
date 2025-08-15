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
