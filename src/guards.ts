/**
 * Runtime type guards.
 *
 * Three functions. `isEventOfType` is re-exported from `./events` rather than
 * redeclared — there is one implementation and it lives next to the union it
 * narrows.
 */

import type { ApiError, ErrorCode } from './index';
import { ERROR_CODES } from './index';
import { isEventOfType } from './events';

export { isEventOfType };

/**
 * `canonicalJson` is surfaced here, the same way `money.ts` surfaces `internal/rounding`.
 *
 * `internal/canonical-json.ts` states the rule: it is the exact byte sequence that
 * `idempotency_record.request_fingerprint` and `ledger_transaction.request_fingerprint` are
 * sha256'd over, two independent services hash it, and a one-byte disagreement degrades the
 * whole idempotency layer silently. That rule is unenforceable while the function is
 * unreachable from outside the package — payzeno-api had its own copy for months, and that
 * copy turned NaN into `null` instead of throwing.
 *
 * No new entrypoint: `tsup.config.ts` says seven and nothing else, and this is not an eighth.
 */
export { canonicalJson, stableKeys } from './internal/canonical-json';

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}

/**
 * True when `u` is the frozen `ApiError` envelope.
 *
 * payzeno-console's `ApiClient` calls this on every non-2xx body before it
 * decides whether it has a structured Payzeno error or an ALB/nginx HTML page.
 * The `code` check is not cosmetic: a proxy that returns `{"error": "gateway
 * timeout"}` passes a shape-only check and then blows up on `.error.code`.
 */
export function isApiError(u: unknown): u is ApiError {
  if (typeof u !== 'object' || u === null) {
    return false;
  }
  const candidate = u as { error?: unknown };
  if (typeof candidate.error !== 'object' || candidate.error === null) {
    return false;
  }
  const error = candidate.error as { code?: unknown; message?: unknown; request_id?: unknown };
  return (
    isErrorCode(error.code) &&
    typeof error.message === 'string' &&
    typeof error.request_id === 'string'
  );
}

