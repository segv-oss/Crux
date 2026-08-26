import { pool } from '../config/db.js';
import { createLogger } from '../middleware/logger.js';

const logger = createLogger('seed');

export async function seedDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info('Seeding database with production initial data...');
    await client.query('BEGIN');

    // 1. Users
    await client.query(`
      INSERT INTO users (id, github_id, email, name, avatar_url, status)
      VALUES
        ('usr_sarah', '102030', 'sarah.chen@crux.dev', 'Sarah Chen', 'https://avatars.githubusercontent.com/u/102030', 'active'),
        ('usr_alex', '102031', 'alex.rivera@crux.dev', 'Alex Rivera', 'https://avatars.githubusercontent.com/u/102031', 'active'),
        ('usr_marcus', '102032', 'marcus.vance@crux.dev', 'Marcus Vance', 'https://avatars.githubusercontent.com/u/102032', 'active'),
        ('usr_ghost_org_crux', 'system_ghost_org_crux', 'ghost@system.crux.dev', 'Former Contributor', 'https://crux.dev/avatars/ghost.png', 'active')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Organization
    await client.query(`
      INSERT INTO organizations (id, github_org_id, name, slug, avatar_url)
      VALUES ('org_crux', 'gh_org_9988', 'crux-oss', 'crux-oss', 'https://avatars.githubusercontent.com/u/998800')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Organization Members
    await client.query(`
      INSERT INTO org_members (id, org_id, user_id, role)
      VALUES
        ('mem_1', 'org_crux', 'usr_sarah', 'admin'),
        ('mem_2', 'org_crux', 'usr_alex', 'member'),
        ('mem_3', 'org_crux', 'usr_marcus', 'member')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Repository
    await client.query(`
      INSERT INTO repositories (id, org_id, github_repo_id, name, full_name, default_branch, required_approvals)
      VALUES ('repo_crux_core', 'org_crux', 789456123, 'crux-core', 'crux-oss/crux-core', 'main', 1)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 5. Pull Request (#342)
    await client.query(`
      INSERT INTO pull_requests (
        id, repo_id, author_id, number, title, head_sha, branch, target_branch,
        status, review_decision, checks, version, sequence_number, additions, deletions, files_changed, description
      )
      VALUES (
        'pr_342', 'repo_crux_core', 'usr_alex', 342,
        'feat(core): implement distributed lock in Redis sync engine',
        'a1b2c3d4e5f67890123456789abcdef012345678', 'feat/redis-distributed-lock', 'main',
        'open', 'pending', 'passing', 1, 1040, 248, 32, 4,
        'Implements Redlock distributed mutex algorithm across Redis cluster nodes with auto-lease extension heartbeats.'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. AI Brief
    await client.query(`
      INSERT INTO pr_briefs (
        id, pr_id, risk, review_estimate_minutes, coverage_delta_percent, breaking_changes_count,
        summary, critical_paths, suggested_checklist
      )
      VALUES (
        'brf_342', 'pr_342', 'medium', 12, 4.20, 0,
        'Implements Redlock distributed mutex across Redis cluster shards. Introduces auto-lease renewal and drift calculation buffer.',
        '[{"path":"src/concurrency/redlock.ts","reason":"Core mutex acquisition logic and clock drift compensation","riskLevel":"high"},{"path":"src/queue/outboxRelay.ts","reason":"Worker node distributed locking","riskLevel":"medium"}]'::jsonb,
        '[{"text":"Verify clock drift calculation tolerance threshold","done":true},{"text":"Ensure lease heartbeat stops immediately on SIGTERM","done":false},{"text":"Validate multi-node failover split-brain protection","done":false}]'::jsonb
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 7. Linked Linear Tasks
    await client.query(`
      INSERT INTO pr_tasks (id, pr_id, assignee_id, linear_task_id, title, done, priority, version, linear_url)
      VALUES
        ('tsk_1', 'pr_342', 'usr_alex', 'CRX-410', 'Implement Redlock distributed mutex algorithm', true, 'p0', 1, 'https://linear.app/crux/issue/CRX-410'),
        ('tsk_2', 'pr_342', 'usr_alex', 'CRX-412', 'Add clock drift tolerance configuration buffer', true, 'p1', 1, 'https://linear.app/crux/issue/CRX-412'),
        ('tsk_3', 'pr_342', 'usr_sarah', 'CRX-415', 'Verify lock recovery on node SIGTERM signal', false, 'p1', 1, 'https://linear.app/crux/issue/CRX-415')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Slack Thread Messages
    await client.query(`
      INSERT INTO pr_messages (id, pr_id, user_id, slack_message_id, text, version, sent_at)
      VALUES
        ('msg_1', 'pr_342', 'usr_alex', 'slack_msg_101', 'Hey team, opened PR #342 for the distributed lock engine. Ready for review!', 1, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
        ('msg_2', 'pr_342', 'usr_sarah', 'slack_msg_102', 'Taking a look now. Booting up the Cockpit sandbox.', 1, CURRENT_TIMESTAMP - INTERVAL '1 hour')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Initial PR Event
    await client.query(`
      INSERT INTO pr_events (pr_id, sequence_number, event_type, payload)
      VALUES ('pr_342', 1040, 'pr:updated', '{"title":"feat(core): implement distributed lock in Redis sync engine"}'::jsonb)
      ON CONFLICT (pr_id, sequence_number) DO NOTHING;
    `);

    await client.query('COMMIT');
    logger.info('Database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Database seeding failed');
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding finished');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}
