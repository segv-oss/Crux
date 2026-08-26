import crypto from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import { pool } from '../config/db.js';
import type { AppEnv } from '../types/hono.js';
import { AppError } from './errorHandler.js';
import { createLogger } from './logger.js';

const logger = createLogger('idempotency');

/**
 * Deterministically sorts object keys recursively to produce identical JSON representations
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalJsonStringify).join(',')}]`;
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => `"${key}":${canonicalJsonStringify(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Computes SHA-256 hash of canonical request body
 */
export function computeRequestHash(body: any): string {
  const canonical = canonicalJsonStringify(body ?? {});
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Production Web Standards Idempotency Middleware.
 * Enforces atomic state transitions (processing -> completed) with distributed lock fencing,
 * deterministic payload comparison, cross-user replay protection, and stream-safe response caching.
 */
export function idempotencyGuard() {
  return createMiddleware<AppEnv>(async (c, next) => {
    const key = c.req.header('idempotency-key') || c.req.header('x-idempotency-key');

    // If no Idempotency-Key provided on mutating request, pass through
    if (!key) {
      await next();
      return;
    }

    const orgId = c.get('orgId') || 'public';
    const userId = c.get('userId') || null;
    const endpoint = c.req.path;

    // Read request body safely
    let parsedBody: any = {};
    try {
      const rawText = await c.req.text();
      c.set('rawBody', rawText);
      if (rawText && rawText.trim().length > 0) {
        parsedBody = JSON.parse(rawText);
      }
    } catch {
      parsedBody = {};
    }

    const requestHash = computeRequestHash(parsedBody);
    const lockExpiryMs = 45000;
    const now = Date.now();
    const lockedUntil = new Date(now + lockExpiryMs);

    // 1. Attempt atomic insert of new in-flight record with schema.sql columns (endpoint, request_hash)
    let rowInserted = false;
    let existingRow: any = null;

    try {
      const insertRes = await pool.query(
        `INSERT INTO idempotency_keys (
           org_id, key, user_id, endpoint, request_hash, status, epoch, locked_until, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'processing', 1, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (org_id, key) DO NOTHING
         RETURNING *`,
        [orgId, key, userId, endpoint, requestHash, lockedUntil],
      );

      if (insertRes.rowCount && insertRes.rowCount > 0) {
        rowInserted = true;
      }
    } catch (insertErr) {
      logger.warn({ insertErr }, 'Idempotency insert attempt failed, checking existing lock');
    }

    // 2. If row already exists, evaluate state machine
    if (!rowInserted) {
      const selectRes = await pool.query(
        `SELECT org_id, key, user_id, endpoint, request_hash, status, epoch, locked_until, response_status, response_body
         FROM idempotency_keys
         WHERE org_id = $1 AND key = $2`,
        [orgId, key],
      );

      if (selectRes.rowCount === 0) {
        throw new AppError({
          status: 500,
          code: 'IDEMPOTENCY_RACE_ERROR',
          message: 'Failed to acquire idempotency lock.',
        });
      }

      existingRow = selectRes.rows[0];

      // Cross-user access isolation guard (B3)
      if (existingRow.user_id && userId && existingRow.user_id !== userId) {
        throw new AppError({
          status: 409,
          code: 'IDEMPOTENCY_USER_MISMATCH',
          message: 'Idempotency key was created by a different user.',
        });
      }

      // Cross-endpoint access isolation guard (B3)
      if (existingRow.endpoint !== endpoint) {
        throw new AppError({
          status: 409,
          code: 'IDEMPOTENCY_ENDPOINT_MISMATCH',
          message: `Idempotency key was created for route '${existingRow.endpoint}', cannot reuse on '${endpoint}'.`,
        });
      }

      // Mismatched request hash detection
      if (existingRow.request_hash !== requestHash) {
        throw new AppError({
          status: 422,
          code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
          message: 'Idempotency key has already been used with a different request payload.',
        });
      }

      // Replay completed response
      if (existingRow.status === 'completed') {
        if (existingRow.response_status === 204) {
          return new Response(null, {
            status: 204,
            headers: { 'Idempotency-Status': 'hit' },
          });
        }

        let body: any = null;
        if (existingRow.response_body) {
          try {
            body =
              typeof existingRow.response_body === 'string'
                ? JSON.parse(existingRow.response_body)
                : existingRow.response_body;
          } catch {
            body = existingRow.response_body;
          }
        }

        return c.json(body, existingRow.response_status as any, {
          'Idempotency-Status': 'hit',
        });
      }

      // Stale lease evaluation
      const lockedUntilDate = new Date(existingRow.locked_until).getTime();
      if (existingRow.status === 'processing' && now < lockedUntilDate) {
        throw new AppError({
          status: 409,
          code: 'IDEMPOTENCY_IN_FLIGHT',
          message: 'An identical mutation with this Idempotency-Key is currently being processed.',
        });
      }

      // Take over expired stale lease with incremented epoch
      const newEpoch = (existingRow.epoch || 1) + 1;
      const updateRes = await pool.query(
        `UPDATE idempotency_keys
         SET status = 'processing',
             epoch = $1,
             locked_until = $2,
             user_id = $3,
             endpoint = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE org_id = $5 AND key = $6 AND epoch = $7
         RETURNING *`,
        [newEpoch, lockedUntil, userId, endpoint, orgId, key, existingRow.epoch],
      );

      if (updateRes.rowCount === 0) {
        throw new AppError({
          status: 409,
          code: 'IDEMPOTENCY_IN_FLIGHT',
          message: 'Concurrent worker acquired stale idempotency lease.',
        });
      }
    }

    // 3. Execute downstream route handler
    try {
      await next();

      // 4. Safely clone response to store completed state without consuming client stream
      if (c.res && c.res.status < 500) {
        const cloned = c.res.clone();
        let responseData: any = null;
        try {
          responseData = await cloned.json();
        } catch {
          responseData = await cloned.text().catch(() => null);
        }

        await pool.query(
          `UPDATE idempotency_keys
           SET status = 'completed',
               response_status = $1,
               response_body = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE org_id = $3 AND key = $4`,
          [c.res.status, responseData !== null ? JSON.stringify(responseData) : null, orgId, key],
        );
      }
    } catch (err) {
      // 5. On error, cleanup in-flight lease using autocommit pool connection
      try {
        await pool.query(
          `DELETE FROM idempotency_keys
           WHERE org_id = $1 AND key = $2 AND status = 'processing'`,
          [orgId, key],
        );
      } catch (delErr) {
        logger.warn(
          { delErr, orgId, key },
          'Failed to delete in-flight idempotency lease on error',
        );
      }
      throw err;
    }
  });
}
