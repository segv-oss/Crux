import { pool } from '../config/db.js';
import { createLogger } from '../middleware/logger.js';

const logger = createLogger('cleanup-worker');

export class CleanupWorker {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(intervalMs = 600000) {
    this.intervalMs = intervalMs;
  }

  public async runCleanups(): Promise<void> {
    const client = await pool.connect();
    try {
      // 1. Clean up webhook_dedup_locks older than 7 days in safe PK chunks of 5000
      const dedupRes = await client.query(
        `WITH candidates AS (
           SELECT id FROM webhook_dedup_locks
           WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
           LIMIT 5000
         )
         DELETE FROM webhook_dedup_locks
         WHERE id IN (SELECT id FROM candidates)
         RETURNING id;`,
      );

      if (dedupRes.rowCount && dedupRes.rowCount > 0) {
        logger.info(
          { count: dedupRes.rowCount },
          'Cleaned up expired webhook deduplication records',
        );
      }

      // 2. Clean up idempotency_keys older than 30 days in chunks of 5000
      const idemRes = await client.query(
        `WITH candidates AS (
           SELECT org_id, key FROM idempotency_keys
           WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
           LIMIT 5000
         )
         DELETE FROM idempotency_keys
         WHERE (org_id, key) IN (SELECT org_id, key FROM candidates)
         RETURNING key;`,
      );

      if (idemRes.rowCount && idemRes.rowCount > 0) {
        logger.info({ count: idemRes.rowCount }, 'Cleaned up expired idempotency keys');
      }

      // 3. Clean up expired sandbox_guest_tickets in chunks of 5000
      const ticketRes = await client.query(
        `WITH candidates AS (
           SELECT ticket FROM sandbox_guest_tickets
           WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 day'
           LIMIT 5000
         )
         DELETE FROM sandbox_guest_tickets
         WHERE ticket IN (SELECT ticket FROM candidates)
         RETURNING ticket;`,
      );

      if (ticketRes.rowCount && ticketRes.rowCount > 0) {
        logger.info({ count: ticketRes.rowCount }, 'Cleaned up expired sandbox guest tickets');
      }
    } catch (err) {
      logger.warn({ err }, 'Error running database cleanup tasks');
    } finally {
      client.release();
    }
  }

  public start(): () => void {
    logger.info({ intervalMs: this.intervalMs }, 'Started periodic cleanup worker instance');
    this.timer = setInterval(() => {
      this.runCleanups().catch((err) => logger.error({ err }, 'Cleanup run failed'));
    }, this.intervalMs);

    return () => this.stop();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('Stopped cleanup worker instance');
  }
}

export function startCleanupWorker(intervalMs = 600000): () => void {
  const worker = new CleanupWorker(intervalMs);
  return worker.start();
}
