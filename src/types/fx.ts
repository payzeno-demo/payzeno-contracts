/**
 * Foreign exchange: quotes for adaptive pricing at checkout, and the record of what a
 * shopper was shown. RFC platform-v2 §7.
 *
 * Rates are decimals as strings ("1.0842"), never floats on the wire: the same rule as money.
 */

import type { CurrencyCode, FxQuoteId, IsoTimestamp, MinorUnits } from './scalars';

export interface FxQuote {
  id: FxQuoteId;
  object: 'fx_quote';
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  /** Provider mid-rate, `to` per one `from`. */
  mid_rate: string;
  markup_bps: number;
  /** What the customer is charged at: mid × (1 + markup). */
  rate: string;
  expires_at: IsoTimestamp;
}

/** The original price when a shopper paid in another currency. */
export interface Presentment {
  original_amount_minor: MinorUnits;
  original_currency: CurrencyCode;
  fx_rate: string;
  fx_quote_id: FxQuoteId;
}

/** One way to pay a checkout session, offered when the shopper's country uses another currency. */
export interface CurrencyOption {
  currency: CurrencyCode;
  amount_minor: MinorUnits;
  /** Null for the session's own currency. */
  fx_quote_id: FxQuoteId | null;
  rate: string | null;
  /** True for the option the page pre-selects (the shopper's local currency). */
  recommended: boolean;
}

/** Shopper country → the currency adaptive pricing offers. Countries not listed get none. */
export const COUNTRY_CURRENCY: Readonly<Record<string, CurrencyCode>> = {
  US: 'USD',
  DE: 'EUR',
  FR: 'EUR',
  NL: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  GB: 'GBP',
  IL: 'ILS',
  JP: 'JPY',
};
