import { describe, expect, it } from 'vitest';

import {
  API_KEY_MODES,
  AUDIT_ACTOR_TYPES,
  CARD_FUNDINGS,
  ENTRY_DIRECTIONS,
  IDEMPOTENCY_STATES,
  LEDGER_ACTORS,
  LEDGER_REFERENCE_TYPES,
  PRICING_MODELS,
  RECONCILIATION_RUN_STATUSES,
  REPORTING_WINDOWS,
  TIMESERIES_INTERVALS,
  WEBHOOK_ENDPOINT_STATUSES,
} from './enums';

/**
 * Every tuple in this module backs a native PostgreSQL enum. Postgres enum
 * labels are case-sensitive and cannot be reordered without a migration, so the
 * shape rules below are not style — they are what makes `CREATE TYPE ... AS
 * ENUM (...)` in payzeno-api's and payzeno-ledger's migrations reproducible
 * from this file.
 */
const TUPLES: Array<[string, readonly string[]]> = [
  ['ENTRY_DIRECTIONS', ENTRY_DIRECTIONS],
  ['LEDGER_REFERENCE_TYPES', LEDGER_REFERENCE_TYPES],
  ['LEDGER_ACTORS', LEDGER_ACTORS],
  ['CARD_FUNDINGS', CARD_FUNDINGS],
  ['API_KEY_MODES', API_KEY_MODES],
  ['WEBHOOK_ENDPOINT_STATUSES', WEBHOOK_ENDPOINT_STATUSES],
  ['RECONCILIATION_RUN_STATUSES', RECONCILIATION_RUN_STATUSES],
  ['REPORTING_WINDOWS', REPORTING_WINDOWS],
  ['TIMESERIES_INTERVALS', TIMESERIES_INTERVALS],
  ['IDEMPOTENCY_STATES', IDEMPOTENCY_STATES],
  ['AUDIT_ACTOR_TYPES', AUDIT_ACTOR_TYPES],
  ['PRICING_MODELS', PRICING_MODELS],
];

describe.each(TUPLES)('%s', (name, tuple) => {
  it('is non-empty', () => {
    expect(tuple.length, `${name} is empty`).toBeGreaterThan(0);
  });

  it('has unique members', () => {
    expect(new Set(tuple).size).toBe(tuple.length);
  });

  it('is snake_case — the shape the pg enums require', () => {
    for (const member of tuple) {
      // REPORTING_WINDOWS is '24h' / '7d' / '30d'; digits lead there.
      expect(member, `${name}.${member}`).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
    }
  });
});

describe('the two tuples with no TypeScript consumer', () => {
  // They exist only to back pg enums in payzeno-api and are imported by the
  // Python codegen output. A linter reads them as dead code; they are not.
  it('AUDIT_ACTOR_TYPES still covers every principal kind', () => {
    expect([...AUDIT_ACTOR_TYPES]).toEqual([
      'user',
      'api_key',
      'staff',
      'internal_service',
      'system',
    ]);
  });

  it('IDEMPOTENCY_STATES covers the lease state machine', () => {
    expect([...IDEMPOTENCY_STATES]).toEqual(['in_progress', 'completed', 'failed']);
  });
});
