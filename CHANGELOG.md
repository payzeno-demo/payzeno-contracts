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

### Changed

- `ReconciliationItem.attempt_count`, `.last_error_code` and `.next_attempt_at` promoted from
  optional to required (PAY-2059). Strictly this is a narrowing and therefore a major by
  ADR 0002; shipped as a minor because `ReconciliationItem` is internal-only — it is never
  serialised past `payzeno-api`'s internal controller and the console has no view on it. Both
  consumers were patched in the same week. Do not treat this as precedent.
- Docblock on `ReconciliationItem.next_attempt_at` recording that the retry drain filters on it
  and not on `last_attempt_at` (PAY-2071, arc PERF).

## [3.2.0] — 2026-05-11

### Changed

- `EVENT_SCHEMA_VERSIONS['settlement.completed']` 1 → 2 (PAY-2052). `SettlementCompletedPayload`
  gains `chunk_index` and `chunk_count`; `settled_charge_ids` is now documented as bounded at
  1000 entries. Consumers must switch on `(type, version)` — a v1-only consumer will now see
  partial batches and must DLQ rather than assume completeness.

### Added

- `ERROR_CODES`: `batch_not_reconcilable`, `retry_exhausted` (PAY-2050).

