import crypto from 'node:crypto';
import type pg from 'pg';
import { pool } from '../config/db.js';
import { createLogger } from '../middleware/logger.js';
import type { WebSocketEventType } from '../types/events.js';

const logger = createLogger('store');

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error({ rollbackErr }, 'Failed to rollback transaction');
    }
    throw err;
  } finally {
    client.release();
  }
}

export interface AllocatedSequenceResult {
  sequenceNumber: number;
  eventId: string;
  version: number;
}

/**
 * Allocates a gap-free monotonic sequence number for a pull request under parent row lock
 * and inserts both the pr_events and outbox_events records within the same transaction.
 */
export async function allocateSequenceAndJournal(
  client: pg.PoolClient,
  params: {
    prId: string;
    orgId?: string;
    repoId?: string;
    eventType: WebSocketEventType;
    payload: any;
  },
): Promise<AllocatedSequenceResult> {
  // Step 1: Parent row lock
  const prRes = await client.query(
    'SELECT id, sequence_number, version FROM pull_requests WHERE id = $1 FOR UPDATE',
    [params.prId],
  );

  if (prRes.rowCount === 0) {
    throw new Error(`PullRequest ${params.prId} not found for sequence allocation`);
  }

  const currentSeq = Number.parseInt(prRes.rows[0].sequence_number, 10) || 0;
  const currentVersion = Number.parseInt(prRes.rows[0].version, 10) || 1;
  const nextSeq = currentSeq + 1;
  const nextVersion = currentVersion + 1;

  // Step 2: Update sequence and version on parent PR
  await client.query(
    `UPDATE pull_requests
     SET sequence_number = $1, version = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [nextSeq, nextVersion, params.prId],
  );

  // Step 3: Journal into pr_events
  const eventRes = await client.query(
    `INSERT INTO pr_events (pr_id, sequence_number, event_type, payload)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [params.prId, nextSeq, params.eventType, JSON.stringify(params.payload)],
  );

  const eventId = eventRes.rows[0].id.toString();

  // Step 4: Write to outbox_events with routing columns
  const outboxId = `evt_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  const shardId = Math.floor(Math.random() * 64);

  await client.query(
    `INSERT INTO outbox_events (
       id, shard_id, org_id, repo_id, pr_id, aggregate_type, aggregate_id, event_type, inline_payload, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
    [
      outboxId,
      shardId,
      params.orgId || null,
      params.repoId || null,
      params.prId,
      'PULL_REQUEST',
      params.prId,
      params.eventType,
      JSON.stringify(params.payload),
    ],
  );

  return {
    sequenceNumber: nextSeq,
    eventId,
    version: nextVersion,
  };
}
