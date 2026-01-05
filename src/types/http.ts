/**
 * Named HTTP response shapes.
 *
 * Every one of these was previously an inline anonymous object literal in api-surface.md.
 * An anonymous shape means every consumer invents its own, and the USES_TYPE edges into
 * @payzeno/contracts are lost exactly where they should be densest — the console bootstrap
 * call, the health checks, the balance/backlog reads.
 *
 * This is the widest fan-in module in `types/`, by design.
 */

import type { ReportingWindow, TimeseriesInterval } from './enums';
import type {
  Account,
  Balance,
  LedgerTransaction,
  PostTransactionLine,
} from './ledger';
import type { Merchant, User } from './merchant';
import type { Payout } from './payout';
import type {
  ChargeId,
  CurrencyCode,
  IsoTimestamp,
  LedgerTransactionId,
  MerchantId,
  MinorUnits,
} from './scalars';

export interface LoginRequest {
  email: string;
  password: string;
}

/** `POST /v1/auth/login` */
export interface LoginResponse {
  object: 'login';
  user: User;
  merchant: Merchant;
}

/** `GET /v1/auth/me` — the console bootstrap call. */
export interface SessionResponse {
  object: 'session';
  user: User;
  merchant: Merchant;
  permissions: string[];
}

/** `GET /healthz` on both services. */
export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
}

/** `GET /v1/meta/currencies` */
export interface CurrenciesResponse {
  currencies: CurrencyCode[];
}

/** `POST /internal/v1/accounts/bootstrap` */
export interface BootstrapAccountsResponse {
  accounts: Account[];
  created: number;
}

/** `GET /internal/v1/balances/:merchantId/history`, `GET /v1/reporting/balance-history` */
export interface BalanceHistoryResponse {
  merchant_id: MerchantId;
  currency: CurrencyCode;
  interval: TimeseriesInterval;
  points: TimeseriesPoint[];
}

export interface DashboardSummary {
  object: 'dashboard_summary';
  merchant_id: MerchantId;
  currency: CurrencyCode;
  window: ReportingWindow;
  gross_volume_minor: MinorUnits;
  net_volume_minor: MinorUnits;
  refunded_minor: MinorUnits;
  dispute_count: number;
  succeeded_count: number;
  failed_count: number;
  next_payout: Payout | null;
  balance: Balance;
}

export interface VolumeTimeseries {
  object: 'volume_timeseries';
  merchant_id: MerchantId;
  currency: CurrencyCode;
  interval: TimeseriesInterval;
  points: TimeseriesPoint[];
}
