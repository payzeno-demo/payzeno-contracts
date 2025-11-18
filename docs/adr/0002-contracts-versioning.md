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
