/**
 * payzeno-contracts — src/codegen/errors.ts
 *
 * The codegen error hierarchy.
 *
 * `CodegenError` extends `PayzenoError` even though the
 * generator is not an HTTP surface and nobody will ever
 * serialise one of these into an `ApiError`. Two reasons, and
 * the second is the real one:
 *
 *   1. `toApiError` is useful in the one place the generator
 *      does surface: the CI annotation the parity job writes.
 *   2. One error root per repo. A second unrelated base class
 *      here is how a codebase ends up with two `instanceof`
 *      checks in every catch block.
 *
 * `code` is `internal_error` for all four: the generator is
 * infrastructure, and its failures are never a caller's fault.
 */

import { PayzenoError } from '../errors';
import type { ErrorCode } from '../index';

export abstract class CodegenError extends PayzenoError {
  readonly code: ErrorCode = 'internal_error';
  readonly httpStatus = 500;
}

/**
 * The normaliser met a TypeScript construct it does not know
 * how to represent in the IR.
 *
 * Thrown by `TypeNormalizer.normalizeTypeNode` and
 * `TypeNormalizer.normalizeGeneric`. Caught by `cli.main`,
 * which prints the offending source text and exits 1.
 */
export class UnsupportedTypeError extends CodegenError {
  constructor(sourceText: string, moduleName: string) {
    super(`unsupported type in ${moduleName}: ${sourceText}`, {
      module: moduleName,
      source: sourceText,
    });
  }
}

/**
 * The emitted target does not expose a symbol the TypeScript
 * surface exports, or vice versa.
 *
 * This is the CI gate. payzeno-ledger imports
 * `payzeno_contracts.types` and typechecks against it; a symbol
 * that exists in TS and not in Python is an import error in
 * another repo, discovered at deploy time.
 */
export class ParityViolationError extends CodegenError {
  constructor(
    readonly missing: string[],
    readonly extra: string[],
  ) {
    super(
      `codegen parity violation: ${missing.length} missing, ${extra.length} unexpected`,
      {
        missing: missing.slice(0, 20).join(', '),
        extra: extra.slice(0, 20).join(', '),
      },
    );
  }
}

/**
 * `--check` mode found a file on disk that differs from what
 * the generator would write.
 *
 * The committed `python/` tree is stale, which means whatever
 * the ledger pinned is not what this repo says. `git diff
 * --exit-code` in CI would catch it a step later; this catches
 * it with a filename.
 */
