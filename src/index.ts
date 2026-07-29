/**
 * payzeno-contracts — src/index.ts
 *
 * THE public type surface. This barrel is the flattened contract every
 * consumer sees as `@payzeno/contracts`.
 *
 * RULE: adding an exported symbol to a `src/types/**` module without
 * re-exporting it here is a contract break, not a style problem. The symbol
 * exists in the repo, typechecks locally, and is invisible to all four
 * consumers. `src/index.test.ts` fails on it.
 *
 * RULE: nothing in `src/types/**` may import from here, from `src/events/**`,
 * from `src/internal/**` or from `src/codegen/**`. The dependency arrow runs
 * one way only. `import/no-cycle` catches most violations; the layering test
 * catches the rest.
 *
 * Re-export order is dependency order, leaves first. Keep it that way — it is
 * the only documentation of the layering that a reader gets for free.
 */

export * from './types/scalars';
export * from './types/enums';
export * from './types/errors.types';
export * from './types/merchant';
export * from './types/settlement';
export * from './types/payment';
export * from './types/refund';
export * from './types/dispute';
export * from './types/ledger';
export * from './types/payout';
export * from './types/webhook';
