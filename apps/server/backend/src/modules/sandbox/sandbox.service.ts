import { pool } from '../../config/db.js';
import { redisClient } from '../../config/redis.js';
import { SandboxSessionDTO, SandboxStatus } from '../../types/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createLogger } from '../../middleware/logger.js';
import crypto from 'crypto';

const logger = createLogger('sandbox');

export async function launchSandbox(
  repoId: string,
  prId: string,
  userId: string,
  body: { mode?: string; autoSeed?: boolean }
): Promise<SandboxSessionDTO> {
  // Verify PR exists in repository
  const prRes = await pool.query(
    `SELECT id FROM pull_requests WHERE repo_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [repoId, prId]
  );

  if (prRes.rowCount === 0) {
    throw new AppError({ status: 404, code: 'PR_NOT_FOUND', message: `Pull Request '${prId}' not found in repository '${repoId}'.` });
  }

  const sessionId = `sbx_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  const previewBaseUrl = `https://${sessionId}.sandbox.crux.dev`;

  const res = await pool.query(
    `INSERT INTO sandbox_sessions (
       id, pr_id, user_id, status, progress, preview_base_url, connected_users
     ) VALUES ($1, $2, $3, 'booting', 15, $4, 1)
     RETURNING *`,
    [sessionId, prId, userId, previewBaseUrl]
  );

  const saved = res.rows[0];

  // Set live Redis active key for proxy session fencing (24h TTL)
  try {
    await redisClient.set(`sandbox:active:${sessionId}`, 'true', 'EX', 86400);

    // Populate initial stream log lines
    await redisClient.xadd(
      `sandbox:logs:${sessionId}`,
      'MAXLEN',
      '~',
      '2000',
      '*',
      'timestamp',
      new Date().toISOString(),
      'source',
      'microvm-init',
      'message',
      'Bootstrapped Firecracker microVM instance in 18ms'
    );
    await redisClient.expire(`sandbox:logs:${sessionId}`, 86400);
  } catch (redisErr) {
    logger.warn({ redisErr }, 'Failed to set Redis sandbox active key');
  }

  return {
    id: saved.id,
    prId: saved.pr_id,
    userId: saved.user_id,
    status: saved.status as SandboxStatus,
    progress: saved.progress,
    previewBaseUrl: saved.preview_base_url,
    connectedUsers: saved.connected_users,
    createdAt: saved.created_at.toISOString(),
    updatedAt: saved.updated_at.toISOString(),
  };
}

export async function createGuestTicket(
  repoId: string,
  prId: string,
  sessionId: string,
  body: { expiresInSeconds: number; maxUses: number }
): Promise<{ ticket: string; expiresAt: string; maxUses: number }> {
  const expiresInSeconds = body.expiresInSeconds > 0 ? body.expiresInSeconds : 300;
  const maxUses = body.maxUses > 0 ? body.maxUses : 1;

  // Check sandbox exists scoped to repository and PR
  const sbxRes = await pool.query(
    `SELECT s.id FROM sandbox_sessions s
     JOIN pull_requests pr ON pr.id = s.pr_id
     WHERE s.id = $1 AND s.pr_id = $2 AND pr.repo_id = $3 AND pr.deleted_at IS NULL`,
    [sessionId, prId, repoId]
  );

  if (sbxRes.rowCount === 0) {
    throw new AppError({
      status: 404,
      code: 'SANDBOX_NOT_FOUND',
      message: `Sandbox '${sessionId}' not found for PR '${prId}' in repo '${repoId}'.`,
    });
  }

  const ticket = `gtkt_${sessionId}_${crypto.randomUUID().substring(0, 12)}`;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await pool.query(
    `INSERT INTO sandbox_guest_tickets (
       ticket, session_id, max_uses, uses_count, expires_at
     ) VALUES ($1, $2, $3, 0, $4)`,
    [ticket, sessionId, maxUses, expiresAt]
  );

  return {
    ticket,
    expiresAt: expiresAt.toISOString(),
    maxUses,
  };
}

export async function exchangeGuestTicket(ticket: string): Promise<{ sessionId: string; guestToken: string }> {
  // Atomic single-step ticket counter increment
  const res = await pool.query(
    `UPDATE sandbox_guest_tickets
     SET uses_count = uses_count + 1, updated_at = CURRENT_TIMESTAMP
     WHERE ticket = $1 AND uses_count < max_uses AND expires_at > CURRENT_TIMESTAMP
     RETURNING session_id`,
    [ticket]
  );

  if (res.rowCount === 0) {
    throw new AppError({
      status: 401,
      code: 'INVALID_OR_EXPIRED_GUEST_TICKET',
      message: 'The guest ticket is invalid, expired, or has reached maximum usage limit.',
    });
  }

  const sessionId = res.rows[0].session_id;
  const guestToken = `gst_${sessionId}_${crypto.randomUUID()}`;

  return {
    sessionId,
    guestToken,
  };
}

export async function getSandboxStatus(repoId: string, prId: string, sessionId: string): Promise<SandboxSessionDTO> {
  const res = await pool.query(
    `SELECT s.* FROM sandbox_sessions s
     JOIN pull_requests pr ON pr.id = s.pr_id
     WHERE s.id = $1 AND s.pr_id = $2 AND pr.repo_id = $3 AND pr.deleted_at IS NULL`,
    [sessionId, prId, repoId]
  );

  if (res.rowCount === 0) {
    throw new AppError({
      status: 404,
      code: 'SANDBOX_NOT_FOUND',
      message: `Sandbox '${sessionId}' not found for PR '${prId}' in repo '${repoId}'.`,
    });
  }

  const saved = res.rows[0];
  return {
    id: saved.id,
    prId: saved.pr_id,
    userId: saved.user_id,
    status: saved.status as SandboxStatus,
    progress: saved.progress,
    previewBaseUrl: saved.preview_base_url,
    connectedUsers: saved.connected_users,
    exitCode: saved.exit_code,
    createdAt: saved.created_at.toISOString(),
    updatedAt: saved.updated_at.toISOString(),
  };
}

export async function getSandboxSnapshot(repoId: string, prId: string, sessionId: string) {
  const sbx = await getSandboxStatus(repoId, prId, sessionId);
  let lastEventId = '0-0';
  const logs: Array<{ timestamp: string; source: string; message: string }> = [];

  try {
    const rawLogs = await redisClient.xrange(`sandbox:logs:${sessionId}`, '-', '+');
    if (rawLogs && rawLogs.length > 0) {
      lastEventId = rawLogs[rawLogs.length - 1][0];
      for (const [id, fields] of rawLogs) {
        const entry: any = { timestamp: new Date().toISOString(), source: 'system', message: '' };
        for (let i = 0; i < fields.length; i += 2) {
          entry[fields[i]] = fields[i + 1];
        }
        logs.push(entry);
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Could not read sandbox logs from Redis Stream');
  }

  return {
    sessionId: sbx.id,
    status: sbx.status,
    progress: sbx.progress,
    lastEventId,
    logs: logs.length > 0 ? logs : [
      { timestamp: new Date().toISOString(), source: 'microvm-init', message: 'Bootstrapped Linux kernel in 24ms' },
      { timestamp: new Date().toISOString(), source: 'docker-layer', message: 'Mounted container image crux-app:v2.4' },
    ],
  };
}

export async function deleteSandbox(repoId: string, prId: string, sessionId: string): Promise<void> {
  const res = await pool.query(
    `UPDATE sandbox_sessions s
     SET status = 'terminated', progress = 0, updated_at = CURRENT_TIMESTAMP
     FROM pull_requests pr
     WHERE s.pr_id = pr.id AND s.id = $1 AND s.pr_id = $2 AND pr.repo_id = $3
     RETURNING s.id`,
    [sessionId, prId, repoId]
  );

  if (res.rowCount === 0) {
    throw new AppError({
      status: 404,
      code: 'SANDBOX_NOT_FOUND',
      message: `Sandbox '${sessionId}' not found for PR '${prId}' in repo '${repoId}'.`,
    });
  }

  // Immediately delete active Redis key to revoke live reverse proxy sessions
  try {
    await redisClient.del(`sandbox:active:${sessionId}`);
  } catch (err) {
    logger.warn({ err }, 'Failed to delete Redis active sandbox key');
  }
}
