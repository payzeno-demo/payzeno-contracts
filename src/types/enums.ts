/**
 * Shared enum tuples that back PostgreSQL native enum types.
 *
 * data-model.md declares each of these as a pg enum; without an `as const` here every
 * repo invents its own list and the Python codegen emits a bare `str`.
 *
 * Leaf module — imports nothing.
 */

export const ENTRY_DIRECTIONS = ['debit', 'credit'] as const;
export type EntryDirection = (typeof ENTRY_DIRECTIONS)[number];

export const LEDGER_REFERENCE_TYPES = [
  'payment_intent',
  'charge',
  'refund',
  'dispute',
  'payout',
  'settlement_batch',
  'reconciliation_item',
  'funding_event',
  'reserve_hold',
] as const;
export type LedgerReferenceType = (typeof LEDGER_REFERENCE_TYPES)[number];

export const LEDGER_ACTORS = ['system', 'reconciliation', 'payout_worker', 'admin'] as const;
export type LedgerActor = (typeof LEDGER_ACTORS)[number];

export const CARD_FUNDINGS = ['credit', 'debit', 'prepaid', 'unknown'] as const;
export type CardFunding = (typeof CARD_FUNDINGS)[number];

export const API_KEY_MODES = ['test', 'live'] as const;
export type ApiKeyMode = (typeof API_KEY_MODES)[number];

export const WEBHOOK_ENDPOINT_STATUSES = ['enabled', 'disabled'] as const;
export type WebhookEndpointStatus = (typeof WEBHOOK_ENDPOINT_STATUSES)[number];

export const RECONCILIATION_RUN_STATUSES = ['running', 'succeeded', 'failed'] as const;
export type ReconciliationRunStatus = (typeof RECONCILIATION_RUN_STATUSES)[number];

export const REPORTING_WINDOWS = ['24h', '7d', '30d'] as const;
export type ReportingWindow = (typeof REPORTING_WINDOWS)[number];

export const TIMESERIES_INTERVALS = ['hour', 'day'] as const;
export type TimeseriesInterval = (typeof TIMESERIES_INTERVALS)[number];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const IDEMPOTENCY_STATES = ['in_progress', 'completed', 'failed'] as const;
export type IdempotencyState = (typeof IDEMPOTENCY_STATES)[number];

export const AUDIT_ACTOR_TYPES = [
  'user',
  'api_key',
  'staff',
  'internal_service',
  'system',
] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const PRICING_MODELS = ['blended', 'interchange_plus'] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];
