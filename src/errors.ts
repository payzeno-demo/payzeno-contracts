/**
 * payzeno-contracts — src/errors.ts
 *
 * The shared error base. This is the root of three separate
 * hierarchies:
 *
 *   payzeno-api      ApiException extends PayzenoError
 *   payzeno-console  ConsoleApiError extends PayzenoError
 *   here             CodegenError extends PayzenoError
 *
 * That shared root is the entire reason this file exists in a
 * package with zero runtime dependencies. `toApiError` is the
 * one function that decides the byte shape of every non-2xx
 * response Payzeno emits, and both HTTP surfaces call it rather
 * than assembling the envelope themselves.
 *
 * RULE: do not add a fifth subclass here. Domain-specific
 * errors belong in the service that raises them, extending
 * whichever of the four fits. Every subclass added here becomes
 * a symbol four repos must understand, and `code` must then be
 * a member of ERROR_CODES forever.
 *
 * RULE: `details` is logged. It is free-form on purpose, and it
 * is exactly the place a careless caller puts a PAN. It never
 * contains cardholder data — the redaction layer in payzeno-api
 * assumes this rather than enforcing it.
 */

import type { ApiError, ErrorCode, FieldError } from './index';

/**
 * Base of every Payzeno error that has an HTTP meaning.
 *
 * Subclasses declare `code` and `httpStatus` as readonly class
 * fields. They are abstract rather than constructor arguments so
 * that a subclass cannot be constructed with the wrong pair —
 * the pair is a property of the error TYPE, not of the instance.
 */
export abstract class PayzenoError extends Error {
  /** Machine-readable code. Always a member of `ERROR_CODES`. */
  abstract readonly code: ErrorCode;

  /** The HTTP status the API surface answers with. */
  abstract readonly httpStatus: number;

  /**
   * Safe-to-log context. Never cardholder data, never a secret,
   * never a full request body.
   */
  readonly details: Record<string, unknown>;

  /**
   * Per-field validation failures. Only ever populated on a
   * `ValidationError`; declared on the base so `toApiError` has
   * one code path instead of an instanceof check.
   */
  toApiError(requestId: string): ApiError {
    const error: ApiError['error'] = {
      code: this.code,
      message: this.message,
      request_id: requestId,
    };

    if (this.fieldErrors.length > 0) {
      error.field_errors = this.fieldErrors;
    }

    const safeDetails = toSafeDetails(this.details);
    if (safeDetails !== undefined) {
      error.details = safeDetails;
    }

    return { error };
  }
}

/**
 * `details` is typed loosely on the class and strictly on the
 * wire. Anything that is not a JSON scalar is dropped rather
 * than stringified — a stringified object in an error envelope
 * is how a request body ends up in a log.
 */
function toSafeDetails(
  details: Record<string, unknown>,
): Record<string, string | number | boolean | null> | undefined {
  readonly code: ErrorCode = 'validation_failed';
  readonly httpStatus = 422;
}

/**
 * 400. Two Money values with different currencies met.
 *
 * Payzeno is multi-currency and never cross-currency: there is
 * no FX anywhere in the platform, so this is always a caller
 * bug and never a conversion opportunity.
 */
export class CurrencyMismatchError extends PayzenoError {
  readonly code: ErrorCode = 'currency_mismatch';
  readonly code: ErrorCode = 'not_found';
  readonly code: ErrorCode = 'conflict';
}
