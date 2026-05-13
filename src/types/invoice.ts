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
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceLine {
  description: string;
  quantity: number;
  unit_amount_minor: MinorUnits;
  amount_minor: MinorUnits;
}

export interface Invoice {
  id: InvoiceId;
  object: 'invoice';
  merchant_id: MerchantId;
  subscription_id: string | null;
  number: string;
  status: InvoiceStatus;
  currency: CurrencyCode;
  subtotal_minor: MinorUnits;
  tax_minor: MinorUnits;
  total_minor: MinorUnits;
  amount_paid_minor: MinorUnits;
  lines: InvoiceLine[];
  period_start: IsoDate;
  period_end: IsoDate;
  due_at: IsoTimestamp | null;
  /** True once ledger owns generation for this merchant (arc MIG, step 4). */
  migrated_to_ledger: boolean;
  created_at: IsoTimestamp;
}

export type InvoiceListResponse = Paginated<Invoice>;

/** @deprecated use Invoice. TODO(PAY-1611) remove after the console migration. */
export type InvoiceResponse = Invoice;
