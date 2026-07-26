# ADR 0002 — Versioning `@payzeno/contracts`

- **Status:** Accepted
- **Date:** month 1
- **Author:** Dudi Hotfix (CTO)
- **Supersedes:** nothing
- **Superseded by:** nothing. ADR 0016 extends it for event payloads.

## Context

Four codebases deserialise the shapes in this package: `payzeno-api` and
`payzeno-console` consume it as a workspace dependency, `payzeno-ledger` consumes
the Python codegen from the internal package index, and `payzeno-billing-legacy`
consumes the Java jar from Nexus.

Three of those four deploy on their own schedule. That is the whole problem. When
`payzeno-api` ships a change to a response shape on Tuesday and the ledger picks up
the new package on Thursday, there is a two-day window where a producer and a
consumer disagree about a type. Whether that window is harmless or an incident is
decided entirely by what kind of change it was — and today we have no vocabulary
for that, so every change is argued from first principles in the PR.

We also have no single place that says what version anything is. `package.json` has
one, `pyproject.toml` has another, and `pom.xml` has a third. They have already
drifted twice.

## Decision

**One version string.** `src/version.ts` exports `CONTRACTS_VERSION`. It is
interpolated into `python/pyproject.toml` and `java/pom.xml` by the codegen, and
`src/version.test.ts` asserts all three plus `package.json` agree. A CI job asserts
it again without Node's help, because the test can be skipped and the job cannot.

**Semver, with one rule that is not the usual one.**

- **Additive is a MINOR.** A new exported type, a new optional field on a request,
  a new member on an `as const` tuple that only producers write.
- **Removing or NARROWING an exported symbol is a MAJOR.** Deleting a type,
  deleting a field, tightening a union — and, explicitly, **making an optional
  field required**. That last one is where people argue, so it is written down:
  a consumer that omits the field compiles today and fails validation tomorrow.
  It is a break. It gets a major.
- **Adding a member to a tuple that CONSUMERS switch on is a major** even though it
  is additive, because an exhaustive switch stops being exhaustive. In practice
  this means `ERROR_CODES` and `LEDGER_PURPOSES` are minors (consumers have a
  default branch, and we test that they do) and `PAYMENT_INTENT_STATUSES` is a
  major.
- **`API_VERSION` is a different axis** and does not move with this one. It is the
  date-stamped public HTTP contract. It changes when the outside world's view of
  Payzeno changes, which is rarely.

**Every version bump touches `CHANGELOG.md` in the same commit**, with the ticket
key. The release job reads it.

## Consequences

- We will cut majors more often than a library normally would. Three so far. That
  is correct; a major here costs a coordinated deploy, and a silently-broken
  consumer costs a settlement run.
- "Just make it required, nobody sends null anyway" stops being a review argument
  and starts being a version number. See the 3.3.0 entry in `CHANGELOG.md`, where
  we shipped a narrowing as a minor with an explicit written justification. That is
  allowed exactly once per situation and it is not precedent.
- The version-consistency job is load-bearing. Do not delete it because it went red
  on a Friday; it went red because the tree is inconsistent.

## Alternatives considered

**Date-versioning the whole package**, the way the public API is versioned. Rejected:
a date tells a consumer when something changed, not whether it can upgrade without
reading the diff. The whole point of the number is that it answers that question.

**No versioning at all — everything is `workspace:*`.** This works right up until
the moment a non-TypeScript consumer appears, which happened in month 2 with the
ledger. A Python package cannot depend on a workspace.
