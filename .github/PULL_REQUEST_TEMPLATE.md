# Summary

<!-- What does this PR do and why? Reference contract.md sections where relevant. -->

## Contract deviations

<!-- List any deviation from packages/api-contract/contract.md with justification. "None" is a valid answer. -->

---

# Review checklist

> Reviewers run the full rubric in [docs/review-protocol.md](../../docs/review-protocol.md).
> A PR merges only when zero blocking findings remain. Tick every box honestly —
> each one is independently verified before merge.

## Contract conformance

- [ ] Every route matches contract.md exactly: method, path, `/api/v1` prefix
- [ ] No undocumented endpoints; every deviation listed above
- [ ] Status codes exact (202 accepted-flows, 409 vs 422, 302 OAuth)
- [ ] `Idempotency-Key` mandatory on all mutations; replay returns original response
- [ ] `X-Crux-Request-Id` generated when omitted and propagated to logs
- [ ] Pagination is keyset + bidirectional with enforced limits (100 / 200)
- [ ] Quorum evaluator matches §1.3 exactly (self-review, terminal freeze, draft, `required_approvals = 0`)
- [ ] GDPR purge follows §1.4 order-of-operations
- [ ] Sandbox fencing: Redis `EXISTS` assert on every proxied request + WS handshake (§1.5)
- [ ] WS: `pr:join` tenant gate, monotonic sequence numbers, `lastSequenceNumber` replay, `pr:sync` envelope shape

## Security

- [ ] JWT: algorithm pinned, expiry enforced, secret from env only
- [ ] Object-level authorization on every `:id` param (repos, prs, comments, tasks, messages, sessions)
- [ ] All SQL parameterized; no string-built queries anywhere
- [ ] Request schemas reject or strip unknown fields (no mass assignment)
- [ ] HMAC verified with `timingSafeEqual` against both secrets, 300s skew window
- [ ] Tickets/keys/tokens use CSPRNG only
- [ ] Cookies: `httpOnly`, `secure`, `sameSite`
- [ ] Body size limits + server-enforced pagination caps + rate limits on auth, `guest-exchange`, sandbox launch
- [ ] CORS locked to known origins
- [ ] Soft-delete filters on every query; no internal fields leaked in responses
- [ ] No secrets or PII in logs; request-id correlation present

## Quality

- [ ] Layering: routes → services → data access; no SQL in handlers
- [ ] `expectedVersion` / `expectedHeadSha` checks atomic (WHERE guards, not check-then-act)
- [ ] Multi-step mutations wrapped in transactions
- [ ] Strict TypeScript, no `any`; imports `@crux/api-contract` instead of re-declaring schemas
- [ ] Env validated with Zod; `.env.example` updated; no secrets committed
- [ ] Migrations versioned, reversible, byte-match §11 DDL
- [ ] Tests cover: quorum evaluator, idempotency replay, HMAC verification, tenant gate
- [ ] Graceful shutdown: HTTP server, Socket.IO, DB pool
- [ ] No dead code, no unused deps, no lint suppressions without justification

## PR hygiene

- [ ] No `.env`, secrets, agent folders, or build artifacts committed
- [ ] Commits follow repo conventions; author identity correct
- [ ] New deps justified in summary (exists, maintained, actually used)
