# @payzeno/contracts

The shared type surface for Payzeno. Every request body, response body and event payload that
crosses a service boundary is declared here once, in TypeScript, and generated out to Python
(`payzeno-ledger`) and Java (`payzeno-billing-legacy`). If a type is used by exactly one
service, it does not belong here.

Consumers: `payzeno-api`, `payzeno-console` (workspace deps), `payzeno-ledger`
(`payzeno-contracts==3.4.0` from `pypi.payzeno.internal`), `payzeno-billing-legacy`
(`com.payzeno:payzeno-contracts-java:3.4.0`).

## Three rules, and you can stop reading

1. **Money is always a pair.** `{ amount_minor: number, currency: CurrencyCode }`. Minor units,
   integers, no floats, no `Decimal` on the wire. A field that holds money ends in `_minor` —
   if it doesn't, it isn't money. JPY has exponent 0; see `CURRENCY_EXPONENT`. Use `src/money.ts`
