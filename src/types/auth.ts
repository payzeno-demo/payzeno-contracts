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
      merchant_id: MerchantId;
      api_key_id: ApiKeyId;
      mode: ApiKeyMode;
      scopes: ApiKeyScope[];
    }
  | {
      kind: 'dashboard_session';
      merchant_id: MerchantId;
      user_id: UserId;
      role: UserRole;
    }
  | {
      /**
       * A PAYZENO operator, not a merchant user. Without this variant every platform action —
       * creating a merchant, suspending one, accepting a dispute, forcing a payout, retrying a
       * settlement item — resolves as the merchant's own `admin`, and a merchant can
       * un-suspend itself.
       */
      kind: 'staff_session';
      staff_id: string;
      role: StaffRole;
      /** Required on every staff-marked merchant-scoped read; MerchantScopeGuard reads it. */
      acting_merchant_id: MerchantId | null;
    }
  | {
      kind: 'internal_service';
      service: 'payzeno-ledger' | 'payzeno-billing-legacy';
      scopes: string[];
    }
  | {
      /** Browser-side checkout. Scoped to exactly one PaymentIntent. */
      kind: 'client_secret';
      merchant_id: MerchantId;
      payment_intent_id: PaymentIntentId;
    };
