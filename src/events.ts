/**
 * payzeno-contracts — src/events.ts
 *
 * The internal event bus schema. Exported from `@payzeno/contracts/events`.
 *
 * Transport: SNS topic per bounded context, SQS queue per consumer, fanout by
 * `MessageAttributes.event_type`. Topic and queue names live in `./events/topics`
 * and must match payzeno-infrastructure exactly — that correspondence is what
 * makes the infra topology correlate to the code.
 *
 * The `PayzenoEvent` union lives HERE and not in `events/`, because it is the one
 * place that must import all eight topic modules. That fan-in is deliberate: it is
 * what makes `EventOfType<T>` resolvable and what makes a new event type a
 * compile-time break in every exhaustive switch across three repos.
 *
 * Versioning: `version` is an integer, starts at 1, bumps only on a breaking
 * payload change. Consumers switch on `(type, version)` and route unknown versions
 * to the DLQ rather than guessing. Adding an optional field is not breaking and
 * does not bump. See docs/adr/0016.
 */

export * from './events/envelope';
export * from './events/topics';
export * from './events/payments.events';
export * from './events/settlement.events';
export * from './events/payout.events';
export * from './events/ledger.events';
export * from './events/merchant.events';
export * from './events/billing.events';

import type { EventType } from './events/envelope';
import type {
  DisputeClosedEvent,
  DisputeEvidenceSubmittedEvent,
  DisputeOpenedEvent,
  PaymentAuthorizedEvent,
  PaymentCanceledEvent,
  PaymentCapturedEvent,
  PaymentFailedEvent,
  RefundCreatedEvent,
  RefundFailedEvent,
  RefundSucceededEvent,
} from './events/payments.events';
import type {
  SettlementBatchClosedEvent,
  SettlementCompletedEvent,
  SettlementDuplicateDetectedEvent,
  SettlementFundedEvent,
  SettlementItemSettledEvent,
  SettlementReconciliationFailedEvent,
  SettlementVarianceDetectedEvent,
} from './events/settlement.events';
import type {
  PayoutFailedEvent,
  PayoutPaidEvent,
  PayoutReturnedEvent,
  PayoutScheduledEvent,
} from './events/payout.events';
import type {
  LedgerImbalanceDetectedEvent,
  LedgerTransactionPostedEvent,
} from './events/ledger.events';
import type {
  MerchantBankAccountVerifiedEvent,
  MerchantCreatedEvent,
  MerchantStatusChangedEvent,
  MerchantUpdatedEvent,
} from './events/merchant.events';
import type { InvoiceIssuedEvent } from './events/billing.events';

export type PayzenoEvent =
  | PaymentAuthorizedEvent
  | PaymentCapturedEvent
  | PaymentFailedEvent
  | PaymentCanceledEvent
  | RefundCreatedEvent
  | RefundSucceededEvent
  | RefundFailedEvent
  | DisputeOpenedEvent
  | DisputeEvidenceSubmittedEvent
  | DisputeClosedEvent
  | SettlementBatchClosedEvent
  | SettlementItemSettledEvent
  | SettlementCompletedEvent
  | SettlementReconciliationFailedEvent
  | SettlementDuplicateDetectedEvent
  | SettlementVarianceDetectedEvent
  | SettlementFundedEvent
  | PayoutScheduledEvent
  | PayoutPaidEvent
  | PayoutFailedEvent
  | PayoutReturnedEvent
  | LedgerTransactionPostedEvent
  | LedgerImbalanceDetectedEvent
  | MerchantCreatedEvent
  | MerchantUpdatedEvent
  | MerchantStatusChangedEvent
  | MerchantBankAccountVerifiedEvent
  | InvoiceIssuedEvent;

/** Narrow a `PayzenoEvent` to one member by its `type`. */
export type EventOfType<T extends EventType> = Extract<PayzenoEvent, { type: T }>;

/** The payload of a given event type. */
export type PayloadOfType<T extends EventType> = EventOfType<T>['payload'];

/** Handler signature every consumer implements. See `interfaces.md`. */
export type EventHandler<T extends EventType> = (event: EventOfType<T>) => Promise<void>;

export function isEventOfType<T extends EventType>(
  event: PayzenoEvent,
  type: T,
): event is EventOfType<T> {
  return event.type === type;
}

/**
 * Current schema version per event type. Producers stamp `envelope.version` from this map;
 * consumers reject anything higher than they know how to read.
 *
 * `settlement.completed` is at 2 because the INC hardening added `chunk_index`/`chunk_count`
 * and made `settled_charge_ids` bounded (PAY-2052).
 */
export const EVENT_SCHEMA_VERSIONS: Record<EventType, number> = {
  'payment.authorized': 1,
  'payment.captured': 1,
  'payment.failed': 1,
  'payment.canceled': 1,
