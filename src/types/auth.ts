/**
 * Auth context (produced by payzeno-api middleware, consumed by every guard).
 *
 * Five variants, discriminated on `kind`. Every guard in payzeno-api switches
 * on it exhaustively via `assertNever`, so adding a variant here is a
 * compile-time break over there — which is the point.
 */

import type { ApiKeyMode } from './enums';
import type { ApiKeyScope, UserRole } from './merchant';
import type { ApiKeyId, MerchantId, PaymentIntentId, UserId } from './scalars';

export const STAFF_ROLES = ['support', 'risk', 'finance', 'admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type AuthPrincipal =
  | {
      kind: 'api_key';
