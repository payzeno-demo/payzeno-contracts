/**
 * The tenant-leak guard, and the reconciliation vocabulary coverage.
 *
 * A `SettlementBatch` has no `merchant_id`, so `MerchantScopeGuard` in
 * payzeno-api cannot scope it. Returning one to a merchant session hands that
 * merchant every other merchant's acquirer totals. `MerchantSettlementBatch`
 * exists so that route has something safe to return, and the assertion below is
 * what stops someone "simplifying" the two back into one.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { MATCH_METHODS, RECONCILIATION_LINE_TYPES } from './settlement';

const source = fs.readFileSync(path.join(__dirname, 'settlement.ts'), 'utf8');

function interfaceBody(name: string): string {
  const start = source.indexOf(`export interface ${name} {`);
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const end = source.indexOf('\n}', start);
  return source.slice(start, end);
}

describe('MerchantSettlementBatch', () => {
  const body = interfaceBody('MerchantSettlementBatch');

  it('carries no acquirer-level money key', () => {
    expect(body).not.toContain('expected_total_minor');
    expect(body).not.toContain('posted_total_minor');
  });

  it('carries merchant_id so the scope guard can filter it', () => {
    expect(body).toContain('merchant_id: MerchantId;');
  });

  it('exposes only this merchant’s item count and net', () => {
    expect(body).toContain('item_count: number;');
    expect(body).toContain('net_minor: MinorUnits;');
  });
});

describe('SettlementBatch', () => {
  const body = interfaceBody('SettlementBatch');

  it('does keep the acquirer totals — it is the internal object', () => {
    expect(body).toContain('expected_total_minor: MinorUnits;');
    expect(body).toContain('posted_total_minor: MinorUnits;');
  });

  it('has no merchant_id at all', () => {
    expect(body).not.toContain('merchant_id');
  });
});

describe('RECONCILIATION_LINE_TYPES', () => {
  it('covers every non-sale line an acquirer file carries', () => {
    // Without these, every refund/chargeback/fee line matches no charge and
    // lands in `orphaned` — "manual investigation" for a large fraction of
    // every batch.
    for (const required of [
      'sale',
      'refund',
      'chargeback',
      'chargeback_reversal',
      'scheme_fee',
      'adjustment',
      'reserve_hold',
      'reserve_release',
    ]) {
      expect(RECONCILIATION_LINE_TYPES).toContain(required);
    }
    expect(RECONCILIATION_LINE_TYPES).toHaveLength(8);
  });
});

describe('MATCH_METHODS', () => {
  it('includes an explicit unmatched sentinel', () => {
    expect(MATCH_METHODS).toContain('unmatched');
  });

  it('orders strongest match first', () => {
    expect(MATCH_METHODS.indexOf('exact_reference')).toBeLessThan(
      MATCH_METHODS.indexOf('heuristic'),
    );
  });

  it('crosses with every line type — 8 × 5 is the reconciler’s state space', () => {
    const combinations = RECONCILIATION_LINE_TYPES.flatMap((line) =>
      MATCH_METHODS.map((method) => `${line}:${method}`),
    );
    expect(new Set(combinations).size).toBe(40);
  });
});

describe('ReconciliationItem', () => {
  const body = interfaceBody('ReconciliationItem');

  // PAY-2059 promoted these from optional to required. A nullable
  // attempt_count means the retry drain cannot tell "never tried" from
  // "tried and the column was never written".
  it('has attempt_count, last_error_code and next_attempt_at as required', () => {
    expect(body).toContain('attempt_count: number;');
    expect(body).toContain('last_error_code: string | null;');
    expect(body).toContain('next_attempt_at: IsoTimestamp;');
    expect(body).not.toContain('attempt_count?');
    expect(body).not.toContain('next_attempt_at?');
  });

  it('records that the drain filters on next_attempt_at, not last_attempt_at', () => {
    expect(body).toContain('last_attempt_at');
    expect(source).toContain('ix_reconciliation_item_next_attempt');
  });
});
