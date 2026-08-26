# Crux Review Protocol

How every PR is reviewed before merging into `main`. The reviewer runs all four
phases in order. A PR merges only when zero **blocking** findings remain.
Findings are always written as: *"standard/contract says X — code does Y — file:line."*

The source of truth for API behavior is
[`packages/api-contract/contract.md`](../packages/api-contract/contract.md).
Zod schemas in [`packages/api-contract/src/schemas.ts`](../packages/api-contract/src/schemas.ts)
are the executable form of everything the contract defines explicitly. Backend code
must import them, not re-declare them.

---

## Phase 0 — Automated gates

Run before any human reading. All must pass:

1. `pnpm install && pnpm build && pnpm typecheck && pnpm lint` — clean, including the PR's package.
2. `pnpm audit` — no known high/critical CVEs in the dependency tree.
3. Every dependency in `package.json` exists on the registry, is maintained, and is actually imported somewhere. Hallucinated or dead deps are blocking.
4. Server boots with a valid `.env`; `GET /api/v1/health` responds; SIGTERM triggers graceful shutdown (stop accepting → drain Socket.IO → close DB pool).
5. Sweep for secrets: no tokens, keys, internal URLs, or `.env` files in the diff. Check logs and error messages too.
6. No agent folders (`.agents/`, `.claude/`), build artifacts, or lockfile churn unrelated to the PR.

---

## Phase 1 — Contract conformance

Walk `contract.md` endpoint by endpoint. For each one verify:

- **Shape**: method, path, and `/api/v1` prefix match the contract exactly.
- **Status codes**: `202` for async flows (merge, sandbox launch, brief re-analysis), `409` for conflicts (`PR_HEAD_SHA_MISMATCH`, version conflicts, `ENTITY_NOT_DELETED`), `422` for semantic violations (`SELF_REVIEW_PROHIBITED`), `302` for OAuth initiation.
- **Headers**: `Idempotency-Key` mandatory on every mutating route; replay of a seen key returns the *original* response without re-executing; `X-Crux-Request-Id` generated when omitted and present in logs.
- **Tenant scoping**: every org/repo/PR-scoped query filters through the `org_members` join of §1.2 — including list endpoints, not just detail endpoints.
- **Pagination**: keyset cursors only (no OFFSET), `forward`/`backward` both implemented, server-enforced limits (`limit` default/max per contract).
- **Quorum evaluator (§1.3)**: logic matches the SQL exactly —
  1. terminal states (`merged`/`closed`) freeze the decision,
  2. draft stays `draft`,
  3. any undismissed `changes_requested` blocks,
  4. `required_approvals = 0` → `not_required`,
  5. approvals counted exclude the PR author,
  6. otherwise `pending`.
  The update bumps `sequence_number` and `version` atomically.
- **GDPR purge (§1.4)**: reassign authorship/comments/messages to the tenant ghost user → delete active `pr_reviews` rows (avoids the unique-constraint collision) → reassign immutable history → delete memberships and user. Order is not negotiable.
- **Sandbox fencing (§1.5)**: `DEL sandbox:active:<sessionId>` on termination; the proxy asserts `EXISTS` on every HTTP request and WS handshake, rejecting with `404 SANDBOX_TERMINATED`.
- **Webhooks (§9)**: HMAC verified against `PRIMARY_SECRET` and `FALLBACK_SECRET` within the 300s skew window; Redis dedup gate (`SET ... NX EX 60`) before processing; raw event into the outbox; response in <50ms.
- **WS (§10)**: handshake carries the token; `pr:join` runs the §1.2 membership gate server-side; `pr:sync` delivers monotonic `sequence_number` events and honors `lastSequenceNumber` replay; nothing ever broadcasts across tenants.

---

## Phase 2 — Security deep-read

Line-by-line review of the security-critical files: auth middleware, tenant gate,
quorum evaluator, idempotency interceptor, webhook ingestion, WS gateway.

- **AuthN**: JWT algorithm pinned (never accepts `none` or algorithm switching), expiry and issuer checked, secrets sourced from env only.
- **AuthZ / IDOR**: every `:id` path parameter (`:orgId`, `:repoId`, `:prId`, `:commentId`, `:taskId`, `:messageId`, `:sessionId`, `:reviewId`) gets an object-level ownership/tenant check. Middleware-level auth alone is not authorization.
- **Injection**: all queries parameterized — including the contract's literal SQL blocks, which must arrive as prepared statements. JSONB payloads validated before storage. No string concatenation into SQL, ever.
- **Mass assignment**: request schemas reject or strip unknown fields. Zod objects in the contract use explicit fields; handlers must not spread raw bodies.
- **Crypto**: HMAC comparison via `timingSafeEqual`; tickets, session ids, and keys from CSPRNG (`crypto.randomBytes` / UUIDv4 via crypto). No `Math.random`, no home-rolled primitives.
- **Cookies**: guest-exchange session cookie is `httpOnly`, `secure`, `sameSite`-scoped.
- **Rate limits / DoS**: JSON body size caps; pagination caps enforced server-side (client-supplied `limit` clamped); rate limits on auth initiation, `guest-exchange`, and sandbox launch; no ReDoS-prone regexes on user input.
- **SSRF**: `preview_base_url` and any sandbox-provided URL validated against an allowlist before being fetched or redirected to.
- **CORS**: origins locked to known frontends; credentials configuration deliberate.
- **Data exposure**: soft-delete (`deleted_at IS NULL`) filters on every read query; list responses don't leak internal fields; no PII, tokens, or secrets in logs.
- **Concurrency**: `expectedVersion` / `expectedHeadSha` checks live inside the `WHERE` clause of the mutation (atomic guard), never as a separate read-then-write. Multi-step invariants (review insert + quorum recalculation) run in one transaction.

---

## Phase 3 — Architecture and repo standards

- **Layering**: routes → services → data access. SQL never appears in route handlers. Transactions open at the service boundary.
- **TypeScript**: strict mode via `packages/config/tsconfig.base.json`; no `any`, no non-null assertions on untrusted data; `@crux/api-contract` imported for all shared shapes.
- **Migrations**: versioned, reversible, and byte-consistent with the §11 DDL — including partial indexes, unique constraints, and the partitioned outbox.
- **Env**: validated at boot with Zod; `.env.example` updated; no `process.env` reads scattered through the code.
- **Lifecycle**: graceful shutdown order (HTTP → Socket.IO → Redis → DB pool); health endpoint reflects real readiness.
- **Tests**: blocking requirement. Minimum coverage: quorum evaluator truth table, idempotency replay, HMAC verification (valid, expired-skew, wrong-secret), tenant gate (allowed + denied), GDPR purge ordering. "Almost complete backend" with zero tests does not merge.
- **AI-slop hunt**: dead code, unused exports, hallucinated packages, inconsistent naming, comments describing behavior the code doesn't have. Any of it is a blocking finding — we don't merge code the author can't explain.
- **Repo hygiene**: no `.agents/`, `.claude/`, or build artifacts in the diff; no lint suppressions without a written justification; PR summary lists new dependencies with a one-line justification each.

---

## Phase 4 — Adversarial pass

The reviewer writes and runs actual attacks against a running instance. Each must
fail cleanly:

1. Access a PR from a user outside the tenant (header tampering + WS join).
2. Submit a review as the PR author.
3. Merge with a stale `expectedHeadSha` / stale `expectedVersion`.
4. Replay an `Idempotency-Key` with a different body.
5. Hit a soft-deleted repo/pr/comment/task by id.
6. Exchange an expired or over-used guest ticket.
7. Post a webhook with a bad signature, stale timestamp, and a replayed delivery id.
8. Access a terminated sandbox through the proxy.

---

## Verdict

Findings are filed as **blocking** (contract violation, security issue, missing
mandatory behavior, zero test coverage in a mandatory area) or **non-blocking**
(style, naming, nice-to-haves). Non-blockers become tracked issues — they do not
block the merge but they are not forgotten.

Zero blocking findings → merge. Anything else → back to the author with the
findings list.
