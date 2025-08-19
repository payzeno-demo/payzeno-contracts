# ADR 0002 — Versioning `@payzeno/contracts`

- **Status:** Accepted
- **Date:** month 1
- **Author:** Dudi Hotfix (CTO)
- **Supersedes:** nothing
- **Superseded by:** nothing. ADR 0016 extends it for event payloads.

## Context

Four codebases deserialise the shapes in this package: `payzeno-api` and
`payzeno-console` consume it as a workspace dependency, `payzeno-ledger` consumes
