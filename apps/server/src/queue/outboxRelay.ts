import { pool } from '../config/db.js';
import { redisPubClient } from '../config/redis.js';
import { createLogger } from '../middleware/logger.js';

const logger = createLogger('outbox-relay');
const MAX_OUTBOX_RETRIES = 5;

export class OutboxRelayWorker {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(intervalMs = 300) {
    this.intervalMs = intervalMs;
  }

  public async processBatch(): Promise<number> {
    const client = await pool.connect();
    try {
      // Work-stealing query with max retry guard
      const res = await client.query(
        `WITH stolen_event AS (
           SELECT created_at, id
           FROM outbox_events
           WHERE status = 'pending'
             AND retry_count < $1
             AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
           ORDER BY created_at ASC, id ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 10
         )
         UPDATE outbox_events e
         SET status = 'processing', updated_at = clock_timestamp()
         FROM stolen_event s
         WHERE e.created_at = s.created_at AND e.id = s.id
         RETURNING e.*`,
        [MAX_OUTBOX_RETRIES],
      );

      if (res.rowCount === 0) {
        return 0;
      }

      for (const row of res.rows) {
        try {
          const payload =
            typeof row.inline_payload === 'string'
              ? JSON.parse(row.inline_payload)
              : row.inline_payload;

          const broadcastMessage = {
            eventId: row.id,
            eventType: row.event_type,
            prId: row.pr_id,
            repoId: row.repo_id,
            orgId: row.org_id,
            payload,
            timestamp: row.created_at,
          };

          // Publish to Redis Pub/Sub for real-time WebSocket distribution
          await redisPubClient.publish('crux:events', JSON.stringify(broadcastMessage));

          // Mark completed
          await client.query(
            `UPDATE outbox_events
             SET status = 'completed', published_at = clock_timestamp(), updated_at = clock_timestamp()
             WHERE created_at = $1 AND id = $2`,
            [row.created_at, row.id],
          );
        } catch (err: any) {
          logger.error(
            { err, outboxId: row.id, retryCount: row.retry_count },
            'Failed to dispatch outbox event',
          );
          const nextRetry = row.retry_count + 1;
          const finalStatus = nextRetry >= MAX_OUTBOX_RETRIES ? 'failed' : 'pending';

          await client.query(
            `UPDATE outbox_events
             SET status = $1, retry_count = $2, last_error = $3, updated_at = clock_timestamp()
             WHERE created_at = $4 AND id = $5`,
            [finalStatus, nextRetry, err.message || 'Unknown error', row.created_at, row.id],
          );
        }
      }

      return res.rowCount || 0;
    } finally {
      client.release();
    }
  }

  public start(): () => void {
    if (this.running) return () => this.stop();
    this.running = true;
    logger.info('Started Outbox Relay worker instance');

    const tick = async () => {
      if (!this.running) return;
      try {
        await this.processBatch();
      } catch (err) {
        logger.error({ err }, 'Error during outbox relay batch processing');
      } finally {
        if (this.running) {
          this.timer = setTimeout(tick, this.intervalMs);
        }
      }
    };

    tick();
    return () => this.stop();
  }

  public stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info('Stopped Outbox Relay worker instance');
  }
}

export function startOutboxRelay(intervalMs = 300): () => void {
  const worker = new OutboxRelayWorker(intervalMs);
  return worker.start();
}
