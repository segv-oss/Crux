import { createMiddleware } from 'hono/factory';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { AppError } from './errorHandler.js';
import { createLogger } from './logger.js';
import { AppEnv } from '../types/hono.js';

const logger = createLogger('idempotency');

export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJsonStringify(item)).join(',')}]`;
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

export function computeRequestHash(body: any): string {
  const canonical = canonicalJsonStringify(body || {});
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export const idempotencyGuard = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    // Only guard mutating HTTP methods
    if (!['POST', 'PATCH', 'DELETE'].includes(c.req.method)) {
      await next();
      return;
    }

    const key = c.req.header('idempotency-key');
    if (!key) {
      throw new AppError({
        status: 400,
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required for mutating requests.',
        type: 'https://crux.dev/errors/missing-idempotency-key',
      });
    }

    const orgId = c.get('orgId') || 'public';
    const userId = c.get('userId') || c.get('user')?.userId || 'anonymous';
    const path = c.req.path;

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

    // 1. Attempt atomic insert of new in-flight record
    let rowInserted = false;
    let existingRow: any = null;

    try {
      const insertRes = await pool.query(
        `INSERT INTO idempotency_keys (
           org_id, key, user_id, route, request_hash, status, epoch, locked_until, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'processing', 1, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (org_id, key) DO NOTHING
         RETURNING *`,
        [orgId, key, userId, path, requestHash, lockedUntil]
      );

      if (insertRes.rowCount && insertRes.rowCount > 0) {
        rowInserted = true;
      }
    } catch (insertErr) {
      logger.warn({ insertErr }, 'Idempotency insert attempt failed, checking conflict');
    }

    // 2. If row already exists, evaluate state machine
    if (!rowInserted) {
      const selectRes = await pool.query(
        `SELECT org_id, key, user_id, route, request_hash, status, epoch, locked_until, response_code, response_body
         FROM idempotency_keys
         WHERE org_id = $1 AND key = $2`,
        [orgId, key]
      );

      if (selectRes.rowCount === 0) {
        throw new AppError({
          status: 500,
          code: 'IDEMPOTENCY_RACE_ERROR',
          message: 'Failed to acquire idempotency lock.',
        });
      }

      existingRow = selectRes.rows[0];

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
        if (existingRow.response_code === 204) {
          return new Response(null, {
            status: 204,
            headers: { 'Idempotency-Status': 'hit' },
          });
        }

        let body: any = null;
        if (existingRow.response_body) {
          try {
            body = typeof existingRow.response_body === 'string'
              ? JSON.parse(existingRow.response_body)
              : existingRow.response_body;
          } catch {
            body = existingRow.response_body;
          }
        }
        
        return c.json(body, existingRow.response_code as any, {
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
             route = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE org_id = $5 AND key = $6 AND epoch = $7
         RETURNING *`,
        [newEpoch, lockedUntil, userId, path, orgId, key, existingRow.epoch]
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
               response_code = $1,
               response_body = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE org_id = $3 AND key = $4`,
          [c.res.status, responseData !== null ? JSON.stringify(responseData) : null, orgId, key]
        );
      }
    } catch (err) {
      // 5. On error, cleanup in-flight lease using autocommit pool connection
      try {
        await pool.query(
          `DELETE FROM idempotency_keys
           WHERE org_id = $1 AND key = $2 AND status = 'processing'`,
          [orgId, key]
        );
      } catch (delErr) {
        logger.warn({ delErr, orgId, key }, 'Failed to delete in-flight idempotency lease on error');
      }
      throw err;
    }
  });
