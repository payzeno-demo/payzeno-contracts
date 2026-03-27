# ADR 0005 — `@payzeno/contracts` has zero runtime dependencies

- **Status:** Accepted
- **Date:** month 2
- **Author:** Dudi Hotfix (CTO)

## Context

The proposal on the table was to add `zod` to this package so that the shapes in
`src/types/**` could be schemas rather than interfaces, and every consumer would get
validation for free.

It is a good idea in isolation and it is the wrong idea here, for reasons that are
specific to what this package is.

This package is the root of the dependency graph. `payzeno-api` depends on it,
`payzeno-console` depends on it, and both of those ship it to production. Anything
in `dependencies` here is in the transitive closure of every Payzeno service, and
it is in the closure at a version WE pin, not one the consumer picks. That is a
supply-chain surface and a version-conflict surface at the same time.

It is also not only a TypeScript package. The types here are generated out to
Pydantic and to Java records. A runtime dependency has no meaning on those sides —
`zod` does not exist in Python — so a `zod` schema would be authoritative in one of
three targets and decorative in the other two. Whichever target the schema is
written for becomes the real contract and the other two drift.

## Decision

**`"dependencies": {}`. This is a contract, not a preference.**

- Asserted by `src/version.test.ts`, which reads `package.json` and checks both
  `dependencies` and `peerDependencies` are empty.
- Asserted again by a CI step, because a test can be skipped.
- `typescript` is a devDependency and is used by `src/codegen/loader.ts` only. It is
  listed in `tsup.config.ts`'s `external` so it can never be bundled into `dist`;
  a 6MB compiler in every consumer's install is exactly the outcome this ADR exists
  to prevent.

Concretely, this is why:

- **`src/ids.ts` validates but does not generate.** Generating a ULID needs entropy
  and a monotonic clock. Each service brings its own library — `ulid` in
  payzeno-api, `python-ulid` in the ledger, `de.huxhorn.sulky.ulid` in the biller —
  and all three validate with ours.
- **There is no `Date` anywhere in this package.** Timestamps are RFC 3339 strings.
  A `Date` does not survive the Python emitter and does not survive JSON, so a date
  library would only be papering over a shape we should not have.
- **There is no HTTP client and no SDK here.** If a consumer needs one, it builds
  its own. Two of them have, and they look nothing alike, and that is fine —
  they have different auth, different retry policy and different error surfaces.

## Consequences

- Validation is the consumer's job. `payzeno-api` validates with `class-validator`
  on DTOs that `implements` the contracts request types; the ledger validates with
  Pydantic on the generated models; the console does not validate inbound at all
  and trusts the API. Three mechanisms, one shape.
- We cannot ship a runtime schema, so nothing here can be enforced at a boundary by
  this package alone. The `extra='forbid'` on the generated Pydantic models is the
  closest thing we have, and it is generated, not imported.
- Someone will propose `zod` again. Point them here. The answer does not change
  because the dependency got smaller.

## Alternatives considered

**`zod` as a peer dependency.** Moves the version conflict to the consumer instead
of removing it, and still leaves the Python and Java arms with nothing.

**A second package, `@payzeno/contracts-schemas`, that depends on this one and on
`zod`.** Genuinely reasonable, and we would take it if validation ever needed to be
shared. Nobody has needed it in a year. Not building it until someone does.
