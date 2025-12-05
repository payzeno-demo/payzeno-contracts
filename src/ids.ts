/**
 * payzeno-contracts — src/ids.ts
 *
 * The identifier prefix table, plus parse and validate.
 *
 * There is deliberately NO generator here. Generating a ULID
 * needs entropy and a monotonic clock, i.e. a runtime
 * dependency, and `dependencies: {}` is a contract
 * (docs/adr/0005). Each service generates with its own library
 * — `ulid` (npm), `python-ulid`, `de.huxhorn.sulky.ulid` — and
 * validates with this one.
 *
 * Format: `<prefix>_<ULID>`, lowercase prefix, underscore,
 * 26-character uppercase Crockford base32.
 * Example: `pi_01HQ8Z3K9X4M2N7P6R5T1V0W8Y`.
 */

import { ValidationError } from './errors';

/**
 * Every public prefix in the platform, mapped to the entity it
 * names and the service that mints it.
 *
 * `pmt_` and `bat_` are VAULT-owned: they resolve to no Payzeno
 * entity at all and Payzeno cannot dereference them. They are
 * here so that `validateId` accepts them on the request bodies
 * that carry them (arc PCI, PAY-1874).
 */
export const ID_PREFIXES = {
  mch: { entity: 'Merchant', owner: 'payzeno-api' },
  usr: { entity: 'User', owner: 'payzeno-api' },
  key: { entity: 'ApiKey', owner: 'payzeno-api' },
  ba: { entity: 'BankAccount', owner: 'payzeno-api' },
  pi: { entity: 'PaymentIntent', owner: 'payzeno-api' },
  ch: { entity: 'Charge', owner: 'payzeno-api' },
  re: { entity: 'Refund', owner: 'payzeno-api' },
  dp: { entity: 'Dispute', owner: 'payzeno-api' },
  evt: { entity: 'WebhookEvent', owner: 'payzeno-api' },
  acct: { entity: 'Account', owner: 'payzeno-ledger' },
  txn: { entity: 'LedgerTransaction', owner: 'payzeno-ledger' },
  le: { entity: 'LedgerEntry', owner: 'payzeno-ledger' },
  sb: { entity: 'SettlementBatch', owner: 'payzeno-ledger' },
  rr: { entity: 'ReconciliationRun', owner: 'payzeno-ledger' },
  ri: { entity: 'ReconciliationItem', owner: 'payzeno-ledger' },
  po: { entity: 'Payout', owner: 'payzeno-ledger' },
  inv: { entity: 'Invoice', owner: 'payzeno-billing-legacy' },
  sub: { entity: 'Subscription', owner: 'payzeno-billing-legacy' },
  pmt: { entity: null, owner: 'payzeno-vault' },
  bat: { entity: null, owner: 'payzeno-vault' },
} as const;

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** True when `s` is a syntactically valid uppercase Crockford ULID. */
export function isUlid(s: string): boolean {
  if (s.length !== ULID_LENGTH) {
    return false;
  }
  for (let i = 0; i < s.length; i += 1) {
    if (!CROCKFORD.includes(s.charAt(i))) {
      return false;
    }
  }
  // The first character encodes the top 3 bits of a 48-bit
  // millisecond timestamp, so anything above '7' overflows the
  // year 10889 and is a malformed id rather than a far-future one.
  return s.charAt(0) <= '7';
}

function isKnownPrefix(prefix: string): prefix is IdPrefix {
  return Object.prototype.hasOwnProperty.call(ID_PREFIXES, prefix);
}

/**
 * Split `<prefix>_<ulid>`.
 *
 * @throws ValidationError when the id has no separator, an
 *   unknown prefix, or a malformed ULID body.
 */
