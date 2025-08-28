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
