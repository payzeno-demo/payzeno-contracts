/**
 * Billing — published by payzeno-billing-legacy on `payzeno-billing-events`.
 *
 * This is the legacy biller's ONLY publish surface, and the reason
 * `EventEnvelope.source` admits `'payzeno-billing-legacy'` at all (that union
 * was widened in the same PR that created this file — arc MIG, month 3).
 *
 * Consumed by payzeno-api's InvoiceProjectionConsumer, which refreshes
 * `invoice_projection` (migration 20) instead of re-fetching over HTTP. The
 * payload therefore has to be sufficient to build the row on its own: the whole
 * point was to stop payzeno-api calling back into the legacy service on every
 * console page load.
 *
 * Note the `_public_id` naming. The legacy biller's own primary keys are bigint
 * auto-increments; `invoice_public_id` is the `inv_`-prefixed ULID it mints for
 * the outside world. They are not the same value and mixing them up leaks the
 * row count of the whole platform.
 */

import type { CurrencyCode, IsoDate, IsoTimestamp, MerchantId, MinorUnits } from '../index';
import type { EventEnvelope } from './envelope';

export interface InvoiceIssuedPayload {
  invoice_public_id: string;
  merchant_id: MerchantId;
  subscription_public_id: string | null;
  number: string;
  status: string;
  currency: CurrencyCode;
  subtotal_minor: MinorUnits;
  tax_minor: MinorUnits;
  total_minor: MinorUnits;
  period_start: IsoDate;
  period_end: IsoDate;
  due_at: IsoTimestamp | null;
  /** True once the ledger owns generation for this merchant (arc MIG step 4). */
  migrated_to_ledger: boolean;
  issued_at: IsoTimestamp;
}
export type InvoiceIssuedEvent = EventEnvelope<'invoice.issued', InvoiceIssuedPayload>;
