import crypto from 'crypto';
import { pool } from '../../config/db.js';
import { redisClient } from '../../config/redis.js';
import { config } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createLogger } from '../../middleware/logger.js';

const logger = createLogger('webhooks');

export function verifyHmacSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  timestampHeader?: string
): 'PRIMARY' | 'FALLBACK' {
  if (!rawBody || !signatureHeader) {
    throw new AppError({
      status: 400,
      code: 'MISSING_WEBHOOK_SIGNATURE',
      message: 'Missing raw payload or HMAC signature header.',
    });
  }

  // Check 300-second timestamp tolerance if timestamp header present
  if (timestampHeader) {
    const timestampMs = parseInt(timestampHeader, 10) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 300000) {
      throw new AppError({
        status: 400,
        code: 'WEBHOOK_TIMESTAMP_EXPIRED',
        message: 'Webhook timestamp differs by more than 300 seconds from server clock.',
      });
    }
  }

  const cleanSig = signatureHeader.replace(/^sha256=/, '');
  let sigBuf: Buffer;
  try {
    sigBuf = Buffer.from(cleanSig, 'hex');
  } catch {
    throw new AppError({
      status: 401,
      code: 'INVALID_WEBHOOK_SIGNATURE',
      message: 'Malformed webhook HMAC signature hex encoding.',
    });
  }

  // 1. Try PRIMARY secret
  const primaryHmac = crypto.createHmac('sha256', config.PRIMARY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const primaryBuf = Buffer.from(primaryHmac, 'hex');

  if (sigBuf.length === primaryBuf.length && crypto.timingSafeEqual(primaryBuf, sigBuf)) {
    return 'PRIMARY';
  }

  // 2. Try FALLBACK secret for zero-downtime rotation
  const fallbackHmac = crypto.createHmac('sha256', config.FALLBACK_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const fallbackBuf = Buffer.from(fallbackHmac, 'hex');

  if (sigBuf.length === fallbackBuf.length && crypto.timingSafeEqual(fallbackBuf, sigBuf)) {
    return 'FALLBACK';
  }

  throw new AppError({
    status: 401,
    code: 'INVALID_WEBHOOK_SIGNATURE',
    message: 'Webhook signature verification failed against primary and fallback secrets.',
  });
}

/**
 * Resolves actual database IDs (org_id, repo_id, pr_id) from raw provider payload
 * to ensure outbox routing columns match existing database entities.
 */
async function resolveRoutingMetadata(
  provider: 'github' | 'linear' | 'slack',
  payload: any
): Promise<{ orgId: string | null; repoId: string | null; prId: string | null }> {
  let orgId: string | null = null;
  let repoId: string | null = null;
  let prId: string | null = null;

  try {
    if (provider === 'github') {
      const githubRepoId = payload.repository?.id;
      if (githubRepoId) {
        const repoRes = await pool.query(
          `SELECT id, org_id FROM repositories WHERE github_repo_id = $1 AND deleted_at IS NULL`,
          [githubRepoId]
        );
        if (repoRes.rowCount && repoRes.rowCount > 0) {
          repoId = repoRes.rows[0].id;
          orgId = repoRes.rows[0].org_id;

          const prNumber = payload.pull_request?.number;
          if (prNumber && repoId) {
            const prRes = await pool.query(
              `SELECT id FROM pull_requests WHERE repo_id = $1 AND number = $2 AND deleted_at IS NULL`,
              [repoId, prNumber]
            );
            if (prRes.rowCount && prRes.rowCount > 0) {
              prId = prRes.rows[0].id;
            }
          }
        }
      }
    } else if (payload.orgId || payload.repoId || payload.prId) {
      orgId = payload.orgId || null;
      repoId = payload.repoId || null;
      prId = payload.prId || null;
    }
  } catch (err) {
    logger.warn({ err }, 'Could not resolve relational routing metadata from webhook payload');
  }

  return { orgId, repoId, prId };
}

export async function processWebhookIngress(
  provider: 'github' | 'linear' | 'slack',
  deliveryId: string,
  rawPayload: any,
  verifiedBySecret: 'PRIMARY' | 'FALLBACK'
): Promise<{ status: string; deliveryId: string; outboxEventId?: string }> {
  // Step 1: Redis fast filter gate
  try {
    const gateKey = `webhook:dedup:${provider}:${deliveryId}`;
    const gateRes = await redisClient.set(gateKey, 'enqueued', 'EX', 60, 'NX');
    if (!gateRes) {
      return { status: 'duplicate_ignored', deliveryId };
    }
  } catch (redisErr) {
    logger.warn({ redisErr }, 'Redis fast-gate unavailable, proceeding directly to database');
  }

  const outboxEventId = `evt_wh_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  const lockId = `${provider}_${deliveryId}`;
  const shardId = Math.floor(Math.random() * 64);

  // Resolve true internal relational IDs
  const { orgId, repoId, prId } = await resolveRoutingMetadata(provider, rawPayload);

  try {
    // Step 2: Database deduplication lock insert
    const lockRes = await pool.query(
      `INSERT INTO webhook_dedup_locks (id, provider, delivery_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, delivery_id) DO NOTHING
       RETURNING id`,
      [lockId, provider, deliveryId]
    );

    if (lockRes.rowCount === 0) {
      return { status: 'duplicate_ignored', deliveryId };
    }

    // Step 3: Enqueue raw event to outbox_events with resolved relational routing keys
    await pool.query(
      `INSERT INTO outbox_events (
         id, shard_id, org_id, repo_id, pr_id, aggregate_type, aggregate_id, event_type, inline_payload, status
       ) VALUES ($1, $2, $3, $4, $5, 'WEBHOOK_INGRESS', $6, $7, $8, 'pending')`,
      [
        outboxEventId,
        shardId,
        orgId,
        repoId,
        prId,
        deliveryId,
        `webhook:${provider}`,
        JSON.stringify({ raw: rawPayload, verifiedBySecret, provider, deliveryId }),
      ]
    );

    return {
      status: 'enqueued',
      deliveryId,
      outboxEventId,
    };
  } catch (dbErr: any) {
    // Fallback to Redis Stream buffer on DB pool exhaustion / timeout
    logger.warn({ dbErr, provider, deliveryId }, 'Database write failed during webhook ingress, buffering to Redis Stream');

    try {
      await redisClient.xadd(
        'webhook:ingress:buffer',
        '*',
        'provider',
        provider,
        'deliveryId',
        deliveryId,
        'verifiedBySecret',
        verifiedBySecret,
        'payload',
        JSON.stringify(rawPayload)
      );
      return {
        status: 'buffered_in_stream',
        deliveryId,
      };
    } catch (streamErr) {
      logger.error({ streamErr }, 'Fatal: Redis stream fallback also failed');
      throw dbErr;
    }
  }
}
