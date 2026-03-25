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
const PARITY_EXEMPT = new Set([
  // Generic helper aliases with no data shape at all. The normaliser drops
  // them; this list is what makes that a decision rather than an accident.
  'EventHandler',
  'EventOfType',
  'PayloadOfType',
  'IdPrefix',
  'TopicName',
  'QueueName',
]);

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

/** Every symbol the emitted files declare. */
export function collectEmittedSymbols(files: EmittedFile[]): Set<string> {
  const out = new Set<string>();
  for (const file of files) {
    for (const symbol of file.symbols) {
      out.add(symbol);
    }
  }
  return out;
}

/**
 * Compare the two sets.
 *
 * @throws ParityViolationError when either side has an entry the other lacks.
 *   Both directions are fatal: an extra symbol means the emitter invented a
 *   name, and an invented name is one nothing can ever remove.
 */
export function diffParity(exported: Set<string>, emitted: Set<string>): ParityReport {
  const missing: string[] = [];
  const extra: string[] = [];
  let matched = 0;

  for (const name of exported) {
    if (emitted.has(name)) {
      matched += 1;
    } else {
      missing.push(name);
    }
  }

  for (const name of emitted) {
    if (!exported.has(name)) {
      extra.push(name);
    }
  }

  missing.sort();
  extra.sort();

  if (missing.length > 0 || extra.length > 0) {
    throw new ParityViolationError(missing, extra);
  }

  return { missing, extra, matched };
}
