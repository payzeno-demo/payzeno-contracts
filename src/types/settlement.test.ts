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
  it('carries no acquirer-level money key', () => {
    expect(body).not.toContain('expected_total_minor');
    expect(body).not.toContain('posted_total_minor');
  });

  it('has no merchant_id at all', () => {
    expect(body).not.toContain('merchant_id');
  });
});

describe('RECONCILIATION_LINE_TYPES', () => {
  const body = interfaceBody('ReconciliationItem');

});
