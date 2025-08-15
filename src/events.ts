/**
 * payzeno-contracts — src/events.ts
 *
 * The internal event bus schema. Exported from `@payzeno/contracts/events`.
 *
 * Transport: SNS topic per bounded context, SQS queue per consumer, fanout by
 * `MessageAttributes.event_type`. Topic and queue names live in `./events/topics`
 * and must match payzeno-infrastructure exactly — that correspondence is what
 * makes the infra topology correlate to the code.
 *
 * The `PayzenoEvent` union lives HERE and not in `events/`, because it is the one
 * place that must import all eight topic modules. That fan-in is deliberate: it is
 * what makes `EventOfType<T>` resolvable and what makes a new event type a
 * compile-time break in every exhaustive switch across three repos.
 *
 * Versioning: `version` is an integer, starts at 1, bumps only on a breaking
 * payload change. Consumers switch on `(type, version)` and route unknown versions
 * to the DLQ rather than guessing. Adding an optional field is not breaking and
 * does not bump. See docs/adr/0016.
