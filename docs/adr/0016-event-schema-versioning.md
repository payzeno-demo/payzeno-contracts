# ADR 0016 — Event schema versioning: consumers switch on `(type, version)`

- **Status:** Accepted
- **Date:** three days after the duplicate-settlement sev1
- **Author:** Noa Migration (Engineering Lead, Core)
- **Extends:** ADR 0002, which covers the package version. This one covers payloads.
- **Related:** ADR 0011 (insert-first idempotency claim), PAY-2041, PAY-2043, PAY-2052

## Context

ADR 0002 versions the *package*. It says nothing about what a consumer should do
when it receives a message whose payload it does not recognise, and during the
incident that gap cost us three hours.

The sequence, for the record. The hotfix added `settlement.duplicate_detected` and
shipped the contracts package the same night. `payzeno-ledger` deployed with it and
started publishing. `payzeno-api`'s `LedgerEventsConsumer` had not deployed yet, so
it received an event type it had never heard of, hit the `default` branch of its
switch, logged at `debug`, and acknowledged the message. From the ledger's side the
event was delivered. From the API's side it never happened. Nobody found out until
someone asked why the duplicate-settlement dashboard was empty on the API side.

That is the failure mode this ADR is about, and it is not specific to a new event
type. The same shape appears whenever a payload changes: PAY-2052 added
`chunk_index` and `chunk_count` to `SettlementCompletedPayload`, and a consumer
that did not know about chunking would have marked a batch complete after seeing
one chunk of five. It would not have errored. It would have marked 4,000 charges
`settled` that were not.

The bus is at-least-once and explicitly unordered. Neither of those helps here —
this is not a delivery problem, it is a comprehension problem.

## Decision

**1. Every envelope carries an integer `version`, and producers stamp it from
`EVENT_SCHEMA_VERSIONS`.** Not from a literal at the call site. The map is in
`src/events.ts` and it has a key for every member of `EVENT_TYPES`;
`src/events.test.ts` asserts that, so a new event type cannot be added without a
version.

**2. Consumers switch on `(type, version)`, never on `type` alone.**

**3. An unknown `type`, or a `version` higher than the consumer knows how to read,
goes to the DLQ. It is never acknowledged and never silently dropped.** The DLQ has
an alarm and a human. A `debug` log does not.

**4. `version` bumps only on a BREAKING payload change.** Adding an optional field
is not breaking and does not bump — a consumer that ignores it is still correct.
Adding a REQUIRED field is breaking. Changing the meaning of an existing field is
breaking even when the type is unchanged, and that is the case people miss:
`settled_charge_ids` went from "all of them" to "up to 1000 of them" without its
type changing at all. That is why `settlement.completed` is at 2 and everything
else is at 1.

**5. A version bump ships with the consumer change, in that order.** Consumers
first, producers second. A consumer that understands v2 handles v1 fine; a producer
emitting v2 into a v1-only fleet is the incident above.

## Consequences

- `EVENT_SCHEMA_VERSIONS` is now a coordination artefact, not a constant. Changing
  a value in it is a two-repo change and the PR must say which consumers were
  deployed first.
- The DLQ will receive real traffic during a rollout window. That is the design
  working. `DeadLetterConsumer` redrives once the consumer is out.
- Every consumer needs a version check it did not have. `BaseEventConsumer` in
  payzeno-api and `BaseConsumer` in payzeno-ledger both do it in the base class, so
  no individual handler has to remember.
- We accepted the cost that a new event type is invisible to consumers until they
  deploy. That was already true. The change is that it is now LOUD.

## What this does not fix

Ordering. An older event can still overwrite a newer one in a projection, and the
version has nothing to say about it. That is handled separately by the
`source_occurred_at` guard on every projection write, documented in the header of
`src/events.ts`. Do not conflate the two: `source_event_id` is a ULID of the event,
not an ordering token for the entity, and using it as one is how a stale
`merchant.status_changed` un-suspends a merchant.
