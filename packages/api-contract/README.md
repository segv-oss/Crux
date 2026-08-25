# @crux/api-contract

The API contract lands here. `spec/openapi.yaml` is the single source of truth consumed by:

- the Rust backend (type/serve generation)
- TS clients across the monorepo (generated fetch client + types)

Until the contract arrives tonight, this package is intentionally empty of endpoints.
When it lands: define paths + schemas here first, then generate — never hand-roll types in apps.
