/**
 * The mirror of payzeno-ledger's `tests/unit/test_contracts_parity.py`.
 *
 * That test asserts `payzeno_contracts.types` exposes every name `src/index.ts`
 * exports. This one asserts the generator produces them. Both directions
 * matter: this catches "we forgot to emit it" at PR time, the ledger's catches
 * "the ledger pinned a version that predates it" at deploy time.
 */

import { describe, expect, it } from 'vitest';

import { ParityViolationError } from './errors';
import { collectEmittedSymbols, collectExportedSymbols, diffParity } from './parity';
import type { SourceModule } from './ir';
import type { EmittedFile } from './emitters/emitter';

const modules: SourceModule[] = [
  {
    moduleName: 'types/merchant',
    filePath: 'src/types/merchant.ts',
    declarations: [
      { name: 'Merchant', kind: 'interface', exported: true, doc: null, members: [] },
      { name: 'MERCHANT_STATUSES', kind: 'const-tuple', exported: true, doc: null, values: [] },
      // Not exported: an internal helper type must not enter the gate.
      { name: 'InternalOnly', kind: 'interface', exported: false, doc: null, members: [] },
      // Exempt by name: a generic helper alias the normaliser drops.
      {
        name: 'EventHandler',
        kind: 'alias',
        exported: true,
        doc: null,
        aliasType: { kind: 'reference', text: 'EventHandler', typeName: 'EventHandler' },
      },
    ],
  },
];

function emitted(symbols: string[]): EmittedFile[] {
  return [{ path: 'merchant.py', contents: '', symbols }];
}

describe('collectExportedSymbols', () => {
  it('collects exported declarations only', () => {
    const symbols = collectExportedSymbols(modules);
    expect([...symbols].sort()).toEqual(['MERCHANT_STATUSES', 'Merchant']);
  });

  it('skips the generic helper aliases the normaliser drops', () => {
    expect(collectExportedSymbols(modules).has('EventHandler')).toBe(false);
  });
});

describe('collectEmittedSymbols', () => {
  it('flattens symbols across files', () => {
    const symbols = collectEmittedSymbols([
      { path: 'a.py', contents: '', symbols: ['A', 'B'] },
      { path: 'b.py', contents: '', symbols: ['B', 'C'] },
    ]);
    expect([...symbols].sort()).toEqual(['A', 'B', 'C']);
  });
});

describe('diffParity', () => {
  it('throws ParityViolationError on a deliberate omission', () => {
    expect(() =>
      diffParity(
        collectExportedSymbols(modules),
        collectEmittedSymbols(emitted(['Merchant'])),
      ),
    ).toThrow(ParityViolationError);
  });

  it('names what is missing', () => {
    try {
      diffParity(collectExportedSymbols(modules), collectEmittedSymbols(emitted(['Merchant'])));
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ParityViolationError);
      expect((error as ParityViolationError).missing).toEqual(['MERCHANT_STATUSES']);
    }
  });

  it('is a 500-class internal error, not a caller error', () => {
    try {
      diffParity(new Set(['Missing']), new Set<string>());
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as ParityViolationError).httpStatus).toBe(500);
      expect((error as ParityViolationError).code).toBe('internal_error');
    }
  });
});
