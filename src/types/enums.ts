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
export type LedgerActor = (typeof LEDGER_ACTORS)[number];

export const API_KEY_MODES = ['test', 'live'] as const;
export const WEBHOOK_ENDPOINT_STATUSES = ['enabled', 'disabled'] as const;
export const RECONCILIATION_RUN_STATUSES = ['running', 'succeeded', 'failed'] as const;
export type ReconciliationRunStatus = (typeof RECONCILIATION_RUN_STATUSES)[number];

export type ReportingWindow = (typeof REPORTING_WINDOWS)[number];

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
