# Crux Backend — Enterprise Production Implementation Plan (Hono Edition)

**Version:** `19.0.0` (Hono v4 + Web Standards Specification)  
**Target Directory:** `/Users/aryanphougat/segv/Crux/crux-backend`  
**Protocol Stack:** Node.js 22+, TypeScript 5.x, Hono v4 (`@hono/node-server`), PostgreSQL 16 (`pg`), Redis Cluster (Pub/Sub + Streams via `ioredis`), Socket.IO v4, AWS S3 SDK  

---

## 1. Core Architectural Invariants & Hono Runtime Implementation Guards

### 1. Hono Stream-Safe Idempotency Middleware (`c.res.clone()`)
- **Runtime Guard:** In Hono, middleware cannot monkey-patch `res.json()`. Instead, `idempotencyGuard()` wraps `await next()`.
- **Stream Consumption Prevention:** To cache the response in `idempotency_keys` without locking out the client stream:
  ```typescript
  await next();
  if (c.res && c.res.status < 500) {
    const cloned = c.res.clone();
    const cachedBody = await cloned.json().catch(() => null);
    if (cachedBody) {
      await storeCompletedIdempotency(orgId, key, requestHash, c.res.status, cachedBody);
    }
  }
  ```
- **Fencing & Error Teardown:** Stale lease takeover increments `epoch`. Downstream 5xx errors execute `pool.query('DELETE FROM idempotency_keys WHERE org_id = $1 AND key = $2 AND status = $3', [orgId, key, 'processing'])` on an autocommit pool connection to prevent dirty transaction state failures.

### 2. Zero-Loss HMAC Webhook Ingress (Raw Text Extraction)
- **Runtime Guard:** Webhook routes (`/api/v1/webhooks/:provider`) read raw text before JSON deserialization:
  ```typescript
  const rawBody = await c.req.text();
  const signature = c.req.header('x-hub-signature-256');
  const secretUsed = verifyHmacSignature(Buffer.from(rawBody), signature);
  const payload = JSON.parse(rawBody);
  ```
- **Deduplication & Fast-Buffer:** Redis fast-gate -> unpartitioned `webhook_dedup_locks` -> `outbox_events`. Pool saturation falls back to Redis Stream `webhook:ingress:buffer` and returns `202 Accepted`.

### 3. Native Web Standards Middleware Stack
- `hono/cors`: Configured using `config.CORS_ORIGIN` (production strictly prohibits wildcard `'*'`).
- `hono/secure-headers`: Enterprise CSP, HSTS, X-Frame-Options.
- `hono/cookie`: `getCookie(c, name)` and `setCookie(c, name, val, { httpOnly: true, secure: true, sameSite: 'Lax' })`.
- `@hono/zod-validator`: Custom RFC 7807 problem details formatter on validation failure (`422 INVALID_PARAMS`).

### 4. Socket.IO & Outbox Relay Integration with `@hono/node-server`
- HTTP + WebSocket bootstrap in `server.ts`:
  ```typescript
  import { serve } from '@hono/node-server';
  import { Server } from 'socket.io';
  import { createAdapter } from '@socket.io/redis-adapter';
  import { createApp } from './app.js';
  import { config } from './config/env.js';
  import { redisPubClient, redisSubClient } from './config/redis.js';
  import { initSocketServer } from './websocket/socketServer.js';

  const app = createApp();
  const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    logger.info({ port: info.port }, `Server listening on ${info.port}`);
  });

  const io = new Server(server, {
    cors: { origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN, credentials: true }
  });
  io.adapter(createAdapter(redisPubClient, redisSubClient));
  initSocketServer(io);
  ```

### 5. Declarative SSE Stream Controller (`hono/streaming`)
- `GET /api/v1/sandboxes/:sessionId/logs/stream` uses `streamSSE(c, async (stream) => ...)` with 15s keep-alive heartbeat comments (`: ping\n\n`) and in-band `event: reset` signaling on buffer eviction.

---

## 2. Updated Directory Structure

```
crux-backend/
├── IMPLEMENTATION_PLAN.md           # Hono Enterprise Production Specification
├── src/
│   ├── app.ts                       # Hono app instance with secureHeaders, cors, and routing
│   ├── server.ts                    # Node.js entry point (@hono/node-server + Socket.IO)
│   ├── routes.ts                    # Master Hono router mounting sub-routers
│   ├── config/
│   │   ├── env.ts                   # Validated environment variables (Zod)
│   │   ├── db.ts                    # pg.Pool connection pool
│   │   ├── redis.ts                 # Dedicated redisClient, redisPubClient, redisSubClient
│   │   └── s3.ts                    # AWS S3 / MinIO client
│   ├── types/
│   │   ├── index.ts                 # DTOs and business domain types
│   │   ├── hono.ts                  # AppEnv types (Variables: { user, orgId, rawBody, userRole })
│   │   └── events.ts                # WebSocket / Outbox event schemas
│   ├── middleware/
│   │   ├── auth.ts                  # Hono JWT authentication & optionalAuth
│   │   ├── tenantGuard.ts           # Hono assertRepoTenantAccess & assertRepoAdminRole
│   │   ├── idempotency.ts           # Hono c.res.clone() composite idempotency guard
│   │   ├── rateLimiter.ts           # Redis & in-memory rate limiting middleware
│   │   ├── validate.ts              # @hono/zod-validator RFC 7807 wrapper
│   │   ├── errorHandler.ts          # Central app.onError RFC 7807 handler
│   │   └── logger.ts                # Pino request logger middleware
│   ├── db/                          # schema.sql, store.ts (transactional parent lock allocator), seed.ts
│   ├── queue/                       # outboxRelay.ts, webhookDrainer.ts, cleanupWorker.ts
│   ├── websocket/                   # socketServer.ts, stateSync.ts
│   └── modules/                     # auth, orgs, repos, prs, briefs, tasks, chat, sandbox, webhooks
```

---

## 3. Testing Strategy (Native Fetch API)
- Replace `supertest` with native `app.request()` — runs in-memory with zero TCP socket overhead and no sandbox `EPERM` issues.
```typescript
const res = await app.request('/api/v1/health');
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.status, 'healthy');
```
