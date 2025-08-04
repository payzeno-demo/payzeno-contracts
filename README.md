# @payzeno/contracts

The shared type surface for Payzeno. Every request body, response body and event payload that
crosses a service boundary is declared here once, in TypeScript, and generated out to Python
(`payzeno-ledger`) and Java (`payzeno-billing-legacy`). If a type is used by exactly one
service, it does not belong here.

Consumers: `payzeno-api`, `payzeno-console` (workspace deps), `payzeno-ledger`
