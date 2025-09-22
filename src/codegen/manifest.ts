/**
 * Package manifests for the generated trees.
 *
 * These are the files that make the cross-repo dependency real:
 * `python/pyproject.toml` is what `payzeno-ledger` resolves
 * `payzeno-contracts==3.4.0` against, and `java/pom.xml` is what
 * `payzeno-billing-legacy` resolves `com.payzeno:payzeno-contracts-java:3.4.0`
 * against. Both interpolate `CONTRACTS_VERSION`; neither is hand-edited.
 */

import { CONTRACTS_VERSION } from '../version';
import type { EmittedFile } from './emitters/emitter';
import { DeterministicWriter } from './writer';
import type { WriteMode, WriteReport } from './writer';

const PYPI_DESCRIPTION =
  'Generated Pydantic models for the Payzeno shared contracts. ' +
  'Source of truth is @payzeno/contracts (TypeScript).';

/** Write `python/pyproject.toml`. */
export function writePythonManifest(
  outDir: string,
  writer: DeterministicWriter = new DeterministicWriter(),
  mode: WriteMode = 'write',
): WriteReport {
  return writer.writeAll([pythonManifest(writer)], outDir, mode);
}

/**
 * Write `java/pom.xml`.
 *
 * Only ever called by `pnpm run codegen:java`, which only ever runs when a
 * human remembers. See PAY-1996.
 */
export function writeJavaManifest(
  outDir: string,
  writer: DeterministicWriter = new DeterministicWriter(),
  mode: WriteMode = 'write',
): WriteReport {
  return writer.writeAll([javaManifest(writer)], outDir, mode);
}
