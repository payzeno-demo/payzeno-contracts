/**
 * The error envelope, the error-code vocabulary, and the two generic
 * list shapes.
 *
 * NOTE: this is the only file in `types/` with a `.types.ts` suffix. It was
 * extracted out of the barrel six months after the rest of the split and
 * nobody renamed it. Not a pattern — do not copy it.
 */

import type { IsoTimestamp } from './scalars';

export const ERROR_CODES = [
  'invalid_request',
  'refund_window_closed',
  'retryable_settlement',
  'orphaned_item',
  'retry_exhausted',
  'settlement_variance_exceeded',
  'validation_failed',
  'authentication_required',
  'invalid_api_key',
  'permission_denied',
  'not_found',
  'idempotency_key_reuse',
  'idempotency_in_progress',
  'invalid_state',
  'conflict',
  'rate_limited',
  'card_declined',
