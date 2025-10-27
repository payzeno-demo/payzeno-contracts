/**
 * Legacy billing (payzeno-billing-legacy, reached through payzeno-api).
 *
 * This is the PRE-MIGRATION shape, verbatim — `number`, `subscription_id`,
 * `period_start`/`period_end` as calendar dates. It is the old biller's JPA
 * model leaking into the shared contract, with `migrated_to_ledger` bolted on
 * rather than the type being split in two.
 *
 * Splitting it before the cutover finishes would strand payzeno-billing-legacy,
 * which deserialises this exact shape from `com.payzeno.contracts.Invoice`.
 * Arc MIG, PAY-1611.
 */

import type { Paginated } from './errors.types';
import type {
  CurrencyCode,
  InvoiceId,
  IsoDate,
  IsoTimestamp,
  MerchantId,
  MinorUnits,
} from './scalars';

export const INVOICE_STATUSES = ['draft', 'open', 'paid', 'uncollectible', 'void'] as const;
export type InvoiceListResponse = Paginated<Invoice>;

