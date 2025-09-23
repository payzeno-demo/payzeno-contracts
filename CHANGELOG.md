# Changelog

Format is loosely [Keep a Changelog]. Versioning rule is in `docs/adr/0002`: additive is a
minor, removing or narrowing an exported symbol is a major. Every entry links its ticket.

[Keep a Changelog]: https://keepachangelog.com/en/1.1.0/

## [Unreleased]

- Nothing yet.

## [3.4.0] — 2026-07-16

### Added

- `LEDGER_PURPOSES` gains `settlement_funding` (PAY-2088). Arc MIG step 5 — the ledger needs a
  purpose for the funding leg now that it owns it.
- `FundingEvent` on `types/settlement.ts` (PAY-2088).

### Notes

- `java/` was **not** regenerated for this release. See PAY-1996.

## [3.3.0] — 2026-06-02
