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

## [3.1.0] — 2026-04-29

Post-incident. Shipped ~14 hours after the duplicate-settlement sev1.

### Added

- `SettlementDuplicateDetectedPayload` / `SettlementDuplicateDetectedEvent`, including
  `detected_by: 'batch_pass' | 'retry_scheduler'` (PAY-2043).
- `settlement.duplicate_detected` registered in `EVENT_TYPES`, `PayzenoEvent`,
  `EVENT_SCHEMA_VERSIONS` (v1) and the `payzeno-ledger-events` topic.
- `ERROR_CODES`: `duplicate_settlement`, `settlement_locked` (PAY-2043).

## [3.0.0] — 2026-03-09

**Breaking.** Arc PCI, scope reduction. Both TypeScript consumers and the ledger had to move
together; the release was coordinated on the day.

### Removed

- `CreateBankAccountRequest.account_number` and `.routing_number`. Bank details are now vaulted
  and referenced by `bank_account_token` (`bat_` prefix) (PAY-1874).
- `CardSummary.pan_first_six`. `CardSummary` is now brand / last_four / exp_month / exp_year /
  country / funding, and nothing else. There is no field in this package that can hold a PAN
  and that is deliberate (PAY-1861).

### Added

- `PaymentMethodToken` (`pmt_`) as the only card handle.
- `pmt_` and `bat_` in `ID_PREFIXES`, flagged as vault-owned — they resolve to no Payzeno entity.
- `FieldError.path` and `ApiError.details` carry explicit "never contains cardholder data" notes.

## [2.6.0] — 2026-01-15

### Added

- `API_VERSION = '2026-01-15'`. The public API date-version is now declared here rather than in
  `payzeno-api`'s config, so the console and the SDK read the same constant.

## [2.4.0] — 2025-12-02

### Added

- `Invoice.migrated_to_ledger` (PAY-1611). Arc MIG. The rest of `Invoice` keeps its legacy shape
  on purpose; splitting the type before the cutover would strand `payzeno-billing-legacy`.
- `InvoiceResponse` deprecated alias. Removal blocked on the console migration.

## [2.2.0] — 2025-11-04

