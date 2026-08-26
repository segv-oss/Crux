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
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_active_email ON users(email) WHERE deleted_at IS NULL;

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
    status VARCHAR(20) DEFAULT 'open',
    review_decision VARCHAR(25) DEFAULT 'pending',
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
    reviewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(30) NOT NULL,
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

-- 9. Hierarchical Inline Code Comments Table
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
    priority VARCHAR(10) DEFAULT 'p1',
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
    status VARCHAR(20) DEFAULT 'pending',
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
