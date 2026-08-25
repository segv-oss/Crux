# Crux Backend — Production API Contract Specification

**Version:** `18.0.0` (Definitive Flawless Enterprise Specification)  
**Protocol:** HTTP/1.1, HTTP/2, WebSocket (Socket.IO v4 + Redis Cluster Pub/Sub + CDC-Driven Event Engine)  
**Default Base URL:** `http://localhost:4000/api/v1`  
**WebSocket URL:** `ws://localhost:4000`  
**Core Architectural Foundations:**
1. Multi-Tenant Tenancy-Asserted WebSocket Room Subscription Gate (`org_members` validation on `pr:join`)
2. Self-Review Protection (`422 SELF_REVIEW_PROHIBITED`) & Non-Author Quorum Evaluator (`reviewer_id != pull_requests.author_id`)
3. Terminal PR State Quorum Guard (`merged`/`closed` status frozen against quorum updates)
4. Collision-Proof GDPR Purge Engine (Deletes active `pr_reviews` rows; safely reassigns `pr_review_history` to `usr_ghost_<orgId>`)
5. Live Proxy Sandbox Session Fencing via Redis Key Assertion (`EXISTS sandbox:active:<sessionId>`)
6. Hierarchy-Strict Comment Model (`ON DELETE RESTRICT` on `parent_comment_id`; soft-deletes exclusively)
7. Automated 30-Day Idempotency Key Cleanup & Tenant Outbox Tombstoning (`status = 'cancelled'`)

---

## 1. Global Conventions, Concurrency & Distributed Invariants

### 1.1 Headers & Concurrency Controls
| Header | Type | Description | Applicability |
|---|---|---|---|
| `Authorization` | String | `Bearer <jwt_token>` | Protected endpoints |
| `Content-Type` | String | `application/json` | Request payloads |
| `X-Crux-Org-Id` | String | Tenant Organization UUID | Tenant-scoped requests |
| `Idempotency-Key` | UUID v4 | Unique client mutation identifier | All mutating routes (`POST`, `PATCH`, `DELETE`, `POST .../restore`) |
| `X-Crux-Request-Id` | String | Distributed tracing trace/span ID | Auto-generated if omitted |

---

### 1.2 Multi-Tenant WebSocket Subscription Gate

To ensure socket connections never leak cross-tenant PR updates:
1. When a client emits `pr:join { prId, repoId }`:
   ```sql
   SELECT 1
   FROM org_members om
   JOIN repositories r ON r.org_id = om.org_id
   JOIN pull_requests pr ON pr.repo_id = r.id
   WHERE om.user_id = :authenticatedUserId
     AND r.id = :repoId
     AND pr.id = :prId
     AND om.deleted_at IS NULL
     AND r.deleted_at IS NULL
     AND pr.deleted_at IS NULL;
   ```
2. If 0 rows match, the server emits `error { code: "FORBIDDEN_TENANT_ACCESS", message: "User does not have access to this repository" }` and rejects room subscription.

---

### 1.3 Self-Review Guard & Terminal State Quorum Evaluator

```sql
UPDATE pull_requests
SET review_decision = (
      SELECT CASE
        -- 1. Terminal states (merged or closed) freeze existing review_decision
        WHEN pull_requests.status IN ('merged', 'closed') THEN pull_requests.review_decision
        -- 2. Draft PRs remain draft
        WHEN pull_requests.status = 'draft' THEN 'draft'
        -- 3. Any active blocking review holds PR in changes_requested
        WHEN EXISTS (
          SELECT 1 FROM pr_reviews
          WHERE pr_id = :prId
            AND action = 'changes_requested'
            AND is_dismissed = false
        ) THEN 'changes_requested'
        -- 4. If required_approvals == 0, marked not_required
        WHEN (SELECT required_approvals FROM repositories WHERE id = pull_requests.repo_id) = 0 THEN 'not_required'
        -- 5. Count of non-author active approvals must satisfy repository required_approvals threshold
        WHEN (
          SELECT COUNT(*) FROM pr_reviews
          WHERE pr_id = :prId
            AND action = 'approved'
            AND is_dismissed = false
            AND reviewer_id != pull_requests.author_id
        ) >= (SELECT required_approvals FROM repositories WHERE id = pull_requests.repo_id) THEN 'approved'
        -- 6. Otherwise pending
        ELSE 'pending'
      END
    ),
    sequence_number = sequence_number + 1,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :prId
RETURNING review_decision, sequence_number, version;
```

---

### 1.4 Collision-Proof GDPR Erasure Pipeline

When executing a legally mandated GDPR purge (`DELETE /api/v1/users/:userId?gdpr_purge=true`):
```sql
-- Step 1: Re-assign authorship, comments, and messages to tenant ghost user
UPDATE pull_requests SET author_id = 'usr_ghost_' || :orgId WHERE author_id = :userId;
UPDATE pull_requests SET merged_by_id = 'usr_ghost_' || :orgId WHERE merged_by_id = :userId;
UPDATE pr_comments SET user_id = 'usr_ghost_' || :orgId WHERE user_id = :userId;
UPDATE pr_messages SET user_id = 'usr_ghost_' || :orgId WHERE user_id = :userId;
UPDATE pr_tasks SET assignee_id = NULL WHERE assignee_id = :userId;

-- Step 2: Delete active pr_reviews row to avoid uq_pr_reviewer unique collision
DELETE FROM pr_reviews WHERE reviewer_id = :userId;

-- Step 3: Re-assign historical immutable audit logs to tenant ghost user
UPDATE pr_review_history SET reviewer_id = 'usr_ghost_' || :orgId WHERE reviewer_id = :userId;
UPDATE pr_review_history SET dismissed_by_id = 'usr_ghost_' || :orgId WHERE dismissed_by_id = :userId;

-- Step 4: Delete user profile, oauth tokens, and memberships
DELETE FROM org_members WHERE user_id = :userId;
DELETE FROM users WHERE id = :userId;
```

---

### 1.5 Live Reverse Proxy Sandbox Session Fencing

To ensure terminated sandboxes immediately revoke all guest session cookies:
1. When a sandbox session transitions to `terminated` or is deleted (`DELETE /sandboxes/:sessionId`):
   - Server executes `DEL sandbox:active:<sessionId>`.
2. The Ephemeral Sandbox Reverse Proxy asserts `EXISTS sandbox:active:<sessionId>` on **every single HTTP request and WebSocket handshake**:
   - If key does not exist, proxy immediately terminates socket with `404 Not Found` `{ "error": "SANDBOX_TERMINATED" }`.

---

### 1.6 Batched 30-Day Idempotency Key Cleanup

```sql
WITH candidates AS (
  SELECT org_id, key FROM idempotency_keys
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
  LIMIT 5000
)
DELETE FROM idempotency_keys
WHERE (org_id, key) IN (SELECT org_id, key FROM candidates);
```

---

## 2. Authentication & Tenancy (`/api/v1/auth`)

### 2.1 Initiate GitHub OAuth
- **Endpoint:** `GET /api/v1/auth/github`
- **Response:** `302 Found`

### 2.2 GitHub OAuth Callback
- **Endpoint:** `GET /api/v1/auth/github/callback?code=<code>&state=<state>`
- **Headers:** `Idempotency-Key` (Supported with `org_id = 'public'`)
- **Response:** `200 OK`

### 2.3 Current User & Tenant Session
- **Endpoint:** `GET /api/v1/auth/me`
- **Response:** `200 OK`

---

## 3. Organizations & Repositories (`/api/v1/orgs` & `/api/v1/repos`)

### 3.1 List Organizations (Bidirectional Keyset Paginated)
- **Endpoint:** `GET /api/v1/orgs`
- **Query Params:** `limit`, `cursor`, `direction`, `includeDeleted`
- **Response:** `200 OK`

### 3.2 List Connected Repositories for Org
- **Endpoint:** `GET /api/v1/orgs/:orgId/repos`
- **Query Params:** `limit`, `cursor`, `direction`, `search`, `includeDeleted`
- **Response:** `200 OK`

### 3.3 Connect Repository
- **Endpoint:** `POST /api/v1/orgs/:orgId/repos`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:** `{ "githubRepoId": 789456123, "fullName": "crux-oss/crux-core", "requiredApprovals": 1 }`
- **Response:** `201 Created`

### 3.4 Soft-Delete or Hard-Purge Repository
- **Endpoint:** `DELETE /api/v1/orgs/:orgId/repos/:repoId`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Response:** `200 OK`

### 3.5 Restore Soft-Deleted Repository
- **Endpoint:** `POST /api/v1/orgs/:orgId/repos/:repoId/restore`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Responses:** `200 OK` or `409 Conflict` (`ENTITY_NOT_DELETED`).

---

## 4. Pull Requests, Reviews, Inline Comments & Diffs

### 4.1 List Pull Requests
- **Endpoint:** `GET /api/v1/repos/:repoId/prs`
- **Query Params:**
  - `status`: `"all" | "open" | "draft" | "merged" | "closed"`
  - `reviewDecision`: `"all" | "pending" | "approved" | "changes_requested" | "not_required" | "draft"`
  - `limit`: `number` (default: 25, max: 100)
  - `cursor`: `string`
  - `direction`: `"forward" | "backward"`
- **Response:** `200 OK`

### 4.2 Get Pull Request Details
- **Endpoint:** `GET /api/v1/repos/:repoId/prs/:prId`
- **Query Params:** `includeDeleted` (boolean)
- **Response:** `200 OK`

### 4.3 Update Pull Request Metadata
- **Endpoint:** `PATCH /api/v1/repos/:repoId/prs/:prId`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:** `{ "title": "Updated title", "expectedVersion": 1 }`
- **Responses:** `200 OK` or `409 Conflict`.

### 4.4 Pull Request Diff Summaries & Chunks
- **File Metadata & Pagination:** `GET /api/v1/repos/:repoId/prs/:prId/diff`
  - **Query Params:** `limit` (default: 50, max: 200), `cursor` (string)
  - **Response:** `200 OK`
- **Single File Parsed Diff AST:** `GET /api/v1/repos/:repoId/prs/:prId/diff/files/:fileIndex`
- **Raw Unified Diff Stream:** `GET /api/v1/repos/:repoId/prs/:prId/diff/raw`

### 4.5 Submit Pull Request Review (Self-Review Guarded)
- **Endpoint:** `POST /api/v1/repos/:repoId/prs/:prId/review`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:**
```json
{
  "action": "approved", // "approved" | "changes_requested" | "comment"
  "comment": "Verified Redlock drift calculation. LGTM!",
  "expectedHeadSha": "a1b2c3d4e5f67890123456789abcdef012345678"
}
```
- **Responses:**
  - `200 OK`: Review submitted & quorum recalculated.
  - `409 Conflict`: `PR_HEAD_SHA_MISMATCH`.
  - `422 Unprocessable Entity`: `SELF_REVIEW_PROHIBITED` if authenticated user is the PR author.

### 4.6 Admin Review Dismissal
- **Endpoint:** `POST /api/v1/repos/:repoId/prs/:prId/reviews/:reviewId/dismiss`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:**
```json
{
  "dismissalReason": "Reviewer left team; architectural changes re-reviewed by tech lead."
}
```
- **Responses:** `200 OK` or `403 Forbidden` / `404 Not Found`.

### 4.7 Hierarchical Inline Code Comments (Max Depth 3 Enforced)
- **List Comments:** `GET /api/v1/repos/:repoId/prs/:prId/comments`
- **Create Comment:** `POST /api/v1/repos/:repoId/prs/:prId/comments`
- **Update Comment:** `PATCH /api/v1/repos/:repoId/prs/:prId/comments/:commentId`
- **Soft-Delete Comment:** `DELETE /api/v1/repos/:repoId/prs/:prId/comments/:commentId`

### 4.8 Merge Pull Request (Dual Concurrency Lock: Head SHA + Version + Quorum Check)
- **Endpoint:** `POST /api/v1/repos/:repoId/prs/:prId/merge`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:**
```json
{
  "expectedHeadSha": "a1b2c3d4e5f67890123456789abcdef012345678",
  "expectedVersion": 3,
  "mergeMethod": "squash",
  "commitTitle": "feat(core): implement distributed lock (#342)",
  "commitMessage": "Squashed commit"
}
```
- **Responses:** `202 Accepted` or `409 Conflict` / `422 Unprocessable Entity`.

---

## 5. AI Reviewer Brief (`/api/v1/repos/:repoId/prs/:prId/brief`)

### 5.1 Get Reviewer Brief
- **Endpoint:** `GET /api/v1/repos/:repoId/prs/:prId/brief`
- **Response:** `200 OK`

### 5.2 Trigger Brief Re-Analysis
- **Endpoint:** `POST /api/v1/repos/:repoId/prs/:prId/brief`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Response:** `202 Accepted`

---

## 6. Tasks (Linear Sync, Attribution & Versioning) (`/api/v1/repos/:repoId/prs/:prId/tasks`)

### 6.1 List Linked Tasks (Bidirectional Keyset Paginated)
- **Endpoint:** `GET /api/v1/repos/:repoId/prs/:prId/tasks`
- **Query Params:** `limit` (default: 50, max: 100), `cursor` (string), `direction` (`forward` | `backward`)
- **Response:** `200 OK`

### 6.2 Create Task (Strict Priority Validation)
- **Endpoint:** `POST /api/v1/repos/:repoId/prs/:prId/tasks`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:**
```json
{
  "linearTaskId": "CRX-414",
  "title": "Verify lock recovery on SIGTERM",
  "priority": "p0", // "p0", "p1", "p2", "p3"
  "assigneeId": "usr_01HJ0A1B2C"
}
```
- **Responses:** `201 Created`, `409 Conflict`, or `422 Unprocessable Entity`.

### 6.3 Toggle / Update Task
- **Endpoint:** `PATCH /api/v1/repos/:repoId/prs/:prId/tasks/:taskId`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:** `{ "done": true, "assigneeId": "usr_01HJ0A1B2C", "expectedVersion": 2 }`
- **Responses:** `200 OK`, `404 TASK_NOT_FOUND_ON_PR`, or `409 Conflict`.

### 6.4 Soft-Delete & Restore Task
- **Delete:** `DELETE /api/v1/repos/:repoId/prs/:prId/tasks/:taskId` -> `200 OK`
- **Restore:** `POST /api/v1/repos/:repoId/prs/:prId/tasks/:taskId/restore` -> `200 OK` or `409 Conflict` (`ENTITY_NOT_DELETED`).

---

## 7. Slack Discussion Sync & Full Lifecycle (`/api/v1/repos/:repoId/prs/:prId/messages`)

### 7.1 List Messages (Cursor Paginated by `sentAt`)
- **Endpoint:** `GET /api/v1/repos/:repoId/prs/:prId/messages`
- **Query Params:** `limit`, `cursor`, `direction`
- **Response:** `200 OK`

### 7.2 Post Message to Thread
- **Endpoint:** `POST /api/v1/repos/:repoId/prs/:prId/messages`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:** `{ "text": "Reviewing now in Cockpit." }`
- **Response:** `201 Created`

### 7.3 Update Synced Slack Message
- **Endpoint:** `PATCH /api/v1/repos/:repoId/prs/:prId/messages/:messageId`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:** `{ "text": "Updated review notes.", "expectedVersion": 1 }`
- **Responses:** `200 OK`, `404 MESSAGE_NOT_FOUND_ON_PR`, or `409 Conflict`.

### 7.4 Delete Synced Slack Message
- **Endpoint:** `DELETE /api/v1/repos/:repoId/prs/:prId/messages/:messageId`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Response:** `200 OK`

---

## 8. Ephemeral Sandboxes, Atomic Tickets, SSE & Live Proxy Fencing

### 8.1 Launch Ephemeral Sandbox
- **Endpoint:** `POST /api/v1/repos/:repoId/prs/:prId/sandboxes`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:** `{ "mode": "isolated", "autoSeed": true }`
- **Response:** `202 Accepted`

### 8.2 Generate Single-Use Guest Invite Ticket
- **Endpoint:** `POST /api/v1/repos/:repoId/prs/:prId/sandboxes/:sessionId/guest-tickets`
- **Headers:** `Idempotency-Key` (Mandatory)
- **Request Body:** `{ "expiresInSeconds": 300, "maxUses": 1 }`
- **Response:** `201 Created`

### 8.3 Atomic Guest Ticket Exchange
- **Endpoint:** `POST /api/v1/sandboxes/guest-exchange`
- **Headers:** `Idempotency-Key` (Supported with `org_id = 'public'`)
- **Request Body:** `{ "ticket": "gtkt_01HJ994X_789abc" }`
- **Response:** `200 OK` (Sets HTTP-only cookie validated against Redis live key `sandbox:active:<sessionId>`)

### 8.4 Get Sandbox Status & State
- **Endpoint:** `GET /api/v1/repos/:repoId/prs/:prId/sandboxes/:sessionId`
- **Response:** `200 OK`

### 8.5 Atomic Snapshot Fallback Read
- **Endpoint:** `GET /api/v1/repos/:repoId/prs/:prId/sandboxes/:sessionId/snapshot`
- **Response:** `200 OK`

### 8.6 Resumable Telemetry Log Stream
- **Endpoint:** `GET /api/v1/repos/:repoId/prs/:prId/sandboxes/:sessionId/logs/stream`
- **Headers:** `Accept: text/event-stream`, `Last-Event-ID: string`

---

## 9. Inbound Webhooks & Ingress Contract (`/webhooks/*`)

### 9.1 Multi-Secret Rotation & Clock-Skew Window
- Validates HMAC against `PRIMARY_SECRET` and `FALLBACK_SECRET` within 300s window.

### 9.2 Sub-50ms Pure Ingestion Contract
1. Atomically sets Redis gate: `SET webhook:dedup:{provider}:{deliveryId} "enqueued" NX EX 60`.
2. Inserts into non-partitioned `webhook_dedup_locks (provider, delivery_id)`.
3. Inserts raw event into `outbox_events` with routing metadata (`org_id`, `repo_id`, `pr_id`).
4. Returns `200 OK` with delivery and outbox event metadata within $<50\text{ ms}$.

---

## 10. WebSocket Specification (Tenant-Asserted Subscriptions)

### 10.1 Handshake & Room Join (Tenant Scoped)
```javascript
const socket = io("ws://localhost:4000", {
  auth: { token: "Bearer eyJhbGciOiJIUzI1NiIsIn..." },
  transports: ["websocket"]
});

// Server asserts org_members membership before subscribing socket to pr:{prId}
socket.emit("pr:join", {
  prId: "pr_01HJ0A1B2C",
  repoId: "repo_01HJ0A1B2C",
  lastSequenceNumber: 1040
});
```

### 10.2 State Synchronization (`pr:sync`)
```json
{
  "type": "incremental",
  "currentSequenceNumber": 1043,
  "events": [
    { "sequenceNumber": 1041, "type": "task:updated", "payload": { ... } },
    { "sequenceNumber": 1042, "type": "message:new", "payload": { ... } },
    { "sequenceNumber": 1043, "type": "pr:review", "payload": { ... } }
  ]
}
```

---

## 11. PostgreSQL Production Schema DDL (Definitive Production Hardened)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Soft-Deletable)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    github_id VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_github ON users(github_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    github_org_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orgs_active_slug ON organizations(slug) WHERE deleted_at IS NULL;

-- 3. Organization Members Table
CREATE TABLE IF NOT EXISTS org_members (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) DEFAULT 'member',
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_lookup ON org_members(org_id, user_id) WHERE deleted_at IS NULL;

-- 4. Repositories Table (with Required Approvals Policy)
CREATE TABLE IF NOT EXISTS repositories (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    default_branch VARCHAR(100) DEFAULT 'main',
    required_approvals INT NOT NULL DEFAULT 1,
    is_private BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_repos_active_tenant_github ON repositories(org_id, github_repo_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_repositories_org_id ON repositories(org_id) WHERE deleted_at IS NULL;

-- 5. Pull Requests Table
CREATE TABLE IF NOT EXISTS pull_requests (
    id VARCHAR(64) PRIMARY KEY,
    repo_id VARCHAR(64) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    author_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    number INT NOT NULL,
    title TEXT NOT NULL,
    head_sha VARCHAR(64) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    target_branch VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'draft', 'merged', 'closed'
    review_decision VARCHAR(25) DEFAULT 'pending', -- 'pending', 'approved', 'changes_requested', 'not_required', 'draft'
    checks VARCHAR(20) DEFAULT 'pending',
    version INT NOT NULL DEFAULT 1,
    sequence_number BIGINT NOT NULL DEFAULT 0,
    additions INT DEFAULT 0,
    deletions INT DEFAULT 0,
    files_changed INT DEFAULT 0,
    description TEXT,
    merged_at TIMESTAMP WITH TIME ZONE NULL,
    merged_by_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE RESTRICT,
    merge_commit_sha VARCHAR(64) NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_id, number)
);
CREATE INDEX IF NOT EXISTS idx_prs_repo_keyset ON pull_requests(repo_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_prs_repo_status_created ON pull_requests(repo_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prs_author ON pull_requests(author_id) WHERE deleted_at IS NULL;

-- 6. Monotonic PR Event Journal
CREATE TABLE IF NOT EXISTS pr_events (
    id BIGSERIAL PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    sequence_number BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pr_id, sequence_number)
);
CREATE INDEX IF NOT EXISTS idx_pr_events_replay ON pr_events(pr_id, sequence_number ASC);

-- 7. Active Pull Request Reviews Table
CREATE TABLE IF NOT EXISTS pr_reviews (
    id VARCHAR(64) PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Cascades on user purge to prevent uq_pr_reviewer collision
    action VARCHAR(30) NOT NULL, -- 'approved', 'changes_requested', 'comment'
    comment TEXT,
    is_dismissed BOOLEAN DEFAULT false,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pr_reviewer UNIQUE (pr_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_pr_updated ON pr_reviews(pr_id, updated_at DESC);

-- 8. Immutable Pull Request Review Audit History Journal
CREATE TABLE IF NOT EXISTS pr_review_history (
    id BIGSERIAL PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    review_id VARCHAR(64) NOT NULL,
    reviewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(30) NOT NULL,
    comment TEXT,
    is_dismissal BOOLEAN DEFAULT false,
    dismissed_by_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE RESTRICT,
    dismissed_reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pr_review_history_pr ON pr_review_history(pr_id, created_at ASC);

-- 9. Hierarchical Inline Code Comments Table (Strict Hierarchy Preservation)
CREATE TABLE IF NOT EXISTS pr_comments (
    id VARCHAR(64) PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    parent_comment_id VARCHAR(64) NULL REFERENCES pr_comments(id) ON DELETE RESTRICT,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    file_path TEXT NOT NULL,
    line_number INT NOT NULL,
    side VARCHAR(10) DEFAULT 'RIGHT',
    body TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pr_comments_tree ON pr_comments(pr_id, parent_comment_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_pr_comments_file ON pr_comments(pr_id, file_path, line_number);

-- 10. Pull Request Diffs
CREATE TABLE IF NOT EXISTS pr_diffs (
    id VARCHAR(64) PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    file_index INT NOT NULL,
    path TEXT NOT NULL,
    old_path TEXT,
    status VARCHAR(20) NOT NULL,
    additions INT NOT NULL DEFAULT 0,
    deletions INT NOT NULL DEFAULT 0,
    is_binary BOOLEAN DEFAULT false,
    s3_patch_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pr_id, file_index)
);
CREATE INDEX IF NOT EXISTS idx_pr_diffs_pr_file ON pr_diffs(pr_id, file_index ASC);

-- 11. Pull Request AI Briefs
CREATE TABLE IF NOT EXISTS pr_briefs (
    id VARCHAR(64) PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE UNIQUE,
    risk VARCHAR(20) NOT NULL,
    review_estimate_minutes INT NOT NULL,
    coverage_delta_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    breaking_changes_count INT NOT NULL DEFAULT 0,
    summary TEXT NOT NULL,
    critical_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pr_briefs_pr ON pr_briefs(pr_id);

-- 12. Tasks Table
CREATE TABLE IF NOT EXISTS pr_tasks (
    id VARCHAR(64) PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    assignee_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE RESTRICT,
    linear_task_id VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT false,
    priority VARCHAR(10) DEFAULT 'p1', -- 'p0', 'p1', 'p2', 'p3'
    version INT NOT NULL DEFAULT 1,
    linear_url TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pr_tasks_linear_link ON pr_tasks(pr_id, linear_task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pr_tasks_keyset ON pr_tasks(pr_id, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_pr_tasks_assignee ON pr_tasks(assignee_id);

-- 13. Slack Thread Messages Table
CREATE TABLE IF NOT EXISTS pr_messages (
    id VARCHAR(64) PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    slack_message_id VARCHAR(64),
    text TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pr_messages_keyset ON pr_messages(pr_id, sent_at ASC, id ASC);

-- 14. Ephemeral Sandbox Sessions
CREATE TABLE IF NOT EXISTS sandbox_sessions (
    id VARCHAR(64) PRIMARY KEY,
    pr_id VARCHAR(64) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'booting',
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    preview_base_url TEXT NOT NULL,
    connected_users INT DEFAULT 1,
    exit_code INT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sandbox_pr_user ON sandbox_sessions(pr_id, user_id, status);

-- 15. Single-Use Guest Invite Tickets
CREATE TABLE IF NOT EXISTS sandbox_guest_tickets (
    ticket VARCHAR(128) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES sandbox_sessions(id) ON DELETE CASCADE,
    max_uses INT NOT NULL DEFAULT 1,
    uses_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_guest_tickets_valid ON sandbox_guest_tickets(session_id, expires_at) WHERE uses_count < max_uses;

-- 16. Dedicated Non-Partitioned Webhook Dedup Lock Table
CREATE TABLE IF NOT EXISTS webhook_dedup_locks (
    id VARCHAR(128) PRIMARY KEY,
    provider VARCHAR(30) NOT NULL,
    delivery_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_webhook_prov_del UNIQUE (provider, delivery_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_dedup_created ON webhook_dedup_locks(created_at ASC);

-- 17. Toastless Partitioned Outbox Table (Dual Routing Indexes)
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(64) NOT NULL,
    shard_id INT NOT NULL,
    org_id VARCHAR(64) NULL,
    repo_id VARCHAR(64) NULL,
    pr_id VARCHAR(64) NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    inline_payload JSONB NULL,
    s3_payload_pointer JSONB NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
    retry_count INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE NULL,
    PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS outbox_events_default PARTITION OF outbox_events DEFAULT;
CREATE INDEX IF NOT EXISTS idx_outbox_work_stealing ON outbox_events(status, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_outbox_shard_status ON outbox_events(shard_id, status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_outbox_pr_routing ON outbox_events(pr_id, status) WHERE pr_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_repo_routing ON outbox_events(repo_id, status) WHERE repo_id IS NOT NULL;

-- 18. Fencing-Token Protected Idempotency Keys Table (30-Day Batched Purge)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    org_id VARCHAR(64) NOT NULL DEFAULT 'public',
    key VARCHAR(128) NOT NULL,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    epoch INT NOT NULL DEFAULT 1,
    response_status INT NULL,
    response_body JSONB NULL,
    locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (org_id, key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(org_id, key, status, locked_until);
CREATE INDEX IF NOT EXISTS idx_idempotency_cleanup ON idempotency_keys(created_at ASC);
```
