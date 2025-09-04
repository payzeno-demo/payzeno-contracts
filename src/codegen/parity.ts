/**
 * The CI gate.
 *
 * Every symbol the TypeScript surface exports must appear in the generated
 * target, and nothing else may. The failure this prevents is not a compile
 * error here — it is an `ImportError` in payzeno-ledger, at deploy time, on a
 * name that used to exist.
 *
 * `payzeno-ledger` runs the mirror assertion in
 * `tests/unit/test_contracts_parity.py`. Both directions are checked because
 * each catches a different mistake: this one catches "we forgot to emit it",
 * the ledger's catches "we emitted it and the ledger never pinned the version
 * that has it".
 */

import { ParityViolationError } from './errors';
import type { SourceModule } from './ir';
import type { EmittedFile } from './emitters/emitter';

export interface ParityReport {
  /** Exported in TypeScript, absent from the emitted target. */
  missing: string[];
  /** Present in the emitted target, exported by no TypeScript module. */
  extra: string[];
  matched: number;
}

/**
 * Symbols that exist in TypeScript and deliberately have no target
 * counterpart. Keep this list short and each entry justified — it is the only
 * escape hatch in the gate.
 */
/** Every exported declaration name across the loaded TypeScript modules. */
export function collectExportedSymbols(modules: SourceModule[]): Set<string> {
  const out = new Set<string>();
  for (const module of modules) {
    for (const declaration of module.declarations) {
      if (!declaration.exported) {
        continue;
      }
      if (PARITY_EXEMPT.has(declaration.name)) {
        continue;
      }
      out.add(declaration.name);
    }
  }
  return out;
}

