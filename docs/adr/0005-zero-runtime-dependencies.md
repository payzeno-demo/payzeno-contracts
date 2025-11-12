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
