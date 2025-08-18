/**
 * payzeno-contracts — src/internal/canonical-json.ts
 *
 * Canonical JSON serialisation. Imports nothing.
 *
 * THE RULE: this is the exact byte sequence that
 * `ledger_transaction.request_fingerprint` (migration 0020) and
 * `idempotency_record.request_fingerprint` are sha256'd over.
 *
 * Two independent services hash it:
 *   - payzeno-api  `IdempotencyInterceptor`
 *   - payzeno-ledger `app/domain/fingerprint.py`
 *
 * If the two ever disagree by a single byte, the whole
 * idempotency layer degrades SILENTLY: the same logical request
 * produces two fingerprints, the replay branch is never taken,
 * and the caller gets a second posting instead of the stored
 * response. Nothing errors. That is why this lives in the
 * shared package rather than being re-implemented per service,
 * and why the rules below are stated rather than assumed.
 *
 * Rules:
 *  1. Object keys are sorted by UTF-16 code unit (JS default
 *     `Array.prototype.sort`), recursively.
 *  2. `undefined` object values are DROPPED. `null` is KEPT and
 *     serialises as `null`. These are different facts: "the
 *     caller did not send the field" vs "the caller sent it
 *     empty".
 *  3. Arrays keep their order. Order is data.
 *  4. Numbers must be finite. NaN and Infinity throw rather
 *     than silently becoming `null` the way JSON.stringify
 *     does.
 *  5. No whitespace anywhere. No trailing newline.
 *  6. Strings are escaped by JSON.stringify, which is already
 *     deterministic and already emits \uXXXX for control
 *     characters. Unicode is NOT normalised — NFC vs NFD is the
 *     caller's problem and normalising here would make the
 *     Python side's job impossible.
 */

/** Anything this module knows how to serialise. */
type JsonPrimitive = string | number | boolean | null;

/**
 * Object keys in canonical (sorted) order, with `undefined`
 * values removed. Exported because payzeno-api's redaction
 * layer walks the same key order when it builds the log line.
 */
export function stableKeys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
}

function serializePrimitive(value: JsonPrimitive): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new RangeError(`canonicalJson: non-finite number: ${String(value)}`);
    }
    // -0 and 0 hash the same everywhere else; normalise so they
    // hash the same here too.
    return Object.is(value, -0) ? '0' : String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return JSON.stringify(value);
}

function serialize(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  const kind = typeof value;

  if (kind === 'string' || kind === 'number' || kind === 'boolean') {
    return serializePrimitive(value as JsonPrimitive);
  }

  if (kind === 'bigint') {
    // bigint has no JSON representation. Money crosses this
    // boundary as an integer `number`, so a bigint here means
    // someone passed an unconverted internal value.
    throw new TypeError('canonicalJson: bigint is not serialisable; convert to number first');
  }

  if (kind === 'function' || kind === 'symbol' || kind === 'undefined') {
    throw new TypeError(`canonicalJson: value of type ${kind} is not serialisable`);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serialize(item === undefined ? null : item)).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = stableKeys(obj);
  const parts: string[] = [];
  for (const key of keys) {
    parts.push(`${JSON.stringify(key)}:${serialize(obj[key])}`);
  }
  return `{${parts.join(',')}}`;
}

/**
 * Canonical JSON for `value`. Deterministic across processes,
 * across Node versions, and across the TypeScript/Python
 * boundary.
 *
 * @throws TypeError on a value JSON cannot represent.
 * @throws RangeError on NaN / Infinity.
 */
export function canonicalJson(value: unknown): string {
  if (value === undefined) {
    throw new TypeError('canonicalJson: cannot serialise undefined at the root');
  }
  return serialize(value);
}
