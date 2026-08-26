import { redisClient } from '../config/redis.js';
import { pool } from '../config/db.js';
import { createLogger } from '../middleware/logger.js';
import crypto from 'crypto';

const logger = createLogger('webhook-drainer');

export class WebhookDrainerWorker {
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(intervalMs: number = 5000) {
    this.intervalMs = intervalMs;
  }

  public async drainStream(): Promise<number> {
    try {
      const entries = await redisClient.xrange('webhook:ingress:buffer', '-', '+', 'COUNT', 10);
      if (!entries || entries.length === 0) return 0;

      const client = await pool.connect();
      let processedCount = 0;

      try {
        for (const [id, fields] of entries) {
          const data: any = {};
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }

          const { provider, deliveryId, verifiedBySecret, payload } = data;
          const parsedPayload = JSON.parse(payload || '{}');
          const lockId = `${provider}_${deliveryId}`;
          const outboxEventId = `evt_wh_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
          const shardId = Math.floor(Math.random() * 64);

          let commitSuccess = false;

          try {
            await client.query('BEGIN');
            await client.query(
              `INSERT INTO webhook_dedup_locks (id, provider, delivery_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (provider, delivery_id) DO NOTHING`,
              [lockId, provider, deliveryId]
            );

            await client.query(
              `INSERT INTO outbox_events (
                 id, shard_id, aggregate_type, aggregate_id, event_type, inline_payload, status
               ) VALUES ($1, $2, 'WEBHOOK_INGRESS', $3, $4, $5, 'pending')`,
              [
                outboxEventId,
                shardId,
                deliveryId,
                `webhook:${provider}`,
                JSON.stringify({ raw: parsedPayload, verifiedBySecret, provider, deliveryId }),
              ]
            );

            await client.query('COMMIT');
            commitSuccess = true;
          } catch (dbErr) {
            try {
              await client.query('ROLLBACK');
            } catch (rollbackErr) {
              logger.error({ rollbackErr }, 'Failed to rollback transaction during drain');
            }
            logger.warn({ dbErr, deliveryId }, 'Failed to drain buffered webhook to database, leaving in stream to retry');
          }

          // Strictly execute xdel ONLY after COMMIT has completely succeeded
          if (commitSuccess) {
            try {
              await redisClient.xdel('webhook:ingress:buffer', id);
              processedCount++;
            } catch (redisDelErr) {
              logger.error({ redisDelErr, id, deliveryId }, 'Failed to delete acknowledged entry from Redis stream');
            }
          }
        }
      } finally {
        client.release();
      }

      return processedCount;
    } catch (err) {
      logger.error({ err }, 'Error querying webhook ingress buffer stream');
      return 0;
    }
  }

  public start(): () => void {
    if (this.running) return () => this.stop();
    this.running = true;
    logger.info('Started Webhook Drainer worker instance');

    const tick = async () => {
      if (!this.running) return;
      try {
        await this.drainStream();
      } catch (err) {
        logger.error({ err }, 'Error during webhook stream draining');
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
    logger.info('Stopped Webhook Drainer worker instance');
  }
}

export function startWebhookDrainer(intervalMs: number = 5000): () => void {
  const worker = new WebhookDrainerWorker(intervalMs);
  return worker.start();
}
