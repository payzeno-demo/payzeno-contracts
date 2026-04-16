# @payzeno/contracts

The shared type surface for Payzeno. Every request body, response body and event payload that
crosses a service boundary is declared here once, in TypeScript, and generated out to Python
(`payzeno-ledger`) and Java (`payzeno-billing-legacy`). If a type is used by exactly one
service, it does not belong here.

Consumers: `payzeno-api`, `payzeno-console` (workspace deps), `payzeno-ledger`
(`payzeno-contracts==3.4.0` from `pypi.payzeno.internal`), `payzeno-billing-legacy`
(`com.payzeno:payzeno-contracts-java:3.4.0`).

## Three rules, and you can stop reading

1. **Money is always a pair.** `{ amount_minor: number, currency: CurrencyCode }`. Minor units,
   integers, no floats, no `Decimal` on the wire. A field that holds money ends in `_minor` —
   if it doesn't, it isn't money. JPY has exponent 0; see `CURRENCY_EXPONENT`. Use `src/money.ts`
   rather than doing the arithmetic yourself, because it is the one implementation the whole org
   agrees with (the ledger mirrors it in `app/domain/money.py`).
2. **Timestamps are RFC 3339 strings**, typed `IsoTimestamp`. There is no `Date` in this package
   and there will not be one — `Date` does not survive the Python emitter and does not survive
   JSON.
3. **Enums are `as const` tuples**, never the `enum` keyword. `export const FOO = [...] as const;
   export type Foo = (typeof FOO)[number];` The tuples are what back the Postgres enums and what
   the codegen turns into `Literal[...]`.

Background: [`docs/adr/0002-contracts-versioning.md`](docs/adr/0002-contracts-versioning.md) and
[`docs/adr/0005-zero-runtime-dependencies.md`](docs/adr/0005-zero-runtime-dependencies.md).

## Install

```bash
pnpm add @payzeno/contracts   # inside the monorepo this resolves to workspace:*
```

Seven entrypoints, and only these seven:

| Subpath | What's in it |
| --- | --- |
| `@payzeno/contracts` | every DTO and domain type (barrel over `src/types/**`) |
| `@payzeno/contracts/events` | `PayzenoEvent`, `EventEnvelope`, `EVENT_TYPES`, `EVENT_SCHEMA_VERSIONS`, `EventHandler<T>` |
| `@payzeno/contracts/errors` | `PayzenoError` and the four concrete subclasses |
| `@payzeno/contracts/guards` | `isEventOfType`, `isApiError`, `assertNever` |
| `@payzeno/contracts/money` | minor-unit arithmetic, formatting, basis points |
| `@payzeno/contracts/ids` | the ID prefix table, `parseId`, `validateId` |
| `@payzeno/contracts/version` | `CONTRACTS_VERSION`, `API_VERSION` |

Deep imports into `dist/` are not supported and we will break them without warning.

## Develop

```bash
pnpm install
pnpm run typecheck        # tsc --noEmit; the real gate
pnpm test                 # vitest, 95% coverage threshold
pnpm run lint
pnpm run build            # tsup, esm + cjs + .d.ts
pnpm run codegen:python   # rewrites python/ — commit the result
pnpm run codegen:java     # rewrites java/  — see the gotcha below
```

## Layering

`IMPORTS` runs strictly downward and CI will not tell you nicely if you break it:

```
codegen/cli → codegen/pipeline → {loader, normalizer, emitters, writer, manifest, parity}
guards / money / ids / errors / events  →  index (the barrel)
index → types/**
types/scalars, types/enums, internal/**  →  nothing
```

- `src/types/**` may import other `src/types/**` modules and nothing else. Not the barrel, not
  `events/`, not `internal/`.
- `src/internal/**` imports **nothing at all**. It's arithmetic and serialisation; it has no
  business knowing what a Merchant is.
- `src/codegen/**` may reach `../version` and `../errors` and that's it. The generator must not
  depend on the types it generates, or you get a bootstrap problem the first time someone
  renames a scalar.

`import/no-cycle` and the `no-restricted-imports` overrides in `.eslintrc.cjs` enforce most of
this. `src/index.test.ts` covers the rest.

## Versioning

Additive is a **minor**. Removing or narrowing an exported symbol is a **major**, including
"just making an optional field required" — three services deserialise these and two of them
deploy on their own schedule. `src/version.ts` is the source of truth and `src/version.test.ts`
asserts it matches `package.json`, `python/pyproject.toml` and `java/pom.xml`. Bump
`CHANGELOG.md` in the same commit; the release job reads it.

Events additionally carry a schema version in `EVENT_SCHEMA_VERSIONS`. Consumers switch on
`(type, version)` and DLQ anything they don't recognise — that convention came out of the
duplicate-settlement incident, see `docs/adr/0016-event-schema-versioning.md`.

## Gotchas

- **Zero runtime dependencies. This is a contract, not a preference.** `"dependencies": {}` is
