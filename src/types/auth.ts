/**
 * Auth context (produced by payzeno-api middleware, consumed by every guard).
 *
 * Five variants, discriminated on `kind`. Every guard in payzeno-api switches
 * on it exhaustively via `assertNever`, so adding a variant here is a
 * compile-time break over there — which is the point.
 */

import type { ApiKeyMode } from './enums';
