import { createMiddleware } from 'hono/factory';
import { redisClient } from '../../config/redis.js';
import { pool } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createLogger } from '../../middleware/logger.js';
import { AppEnv } from '../../types/hono.js';

const logger = createLogger('proxy-fencing');

/**
 * Validates that a MicroVM sandbox session is active before allowing reverse proxy ingress.
 * Fails secure if session is terminated or nonexistent.
 */
export const assertSandboxSessionActive = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = c.req.param('sessionId');
  if (!sessionId) {
    throw new AppError({
      status: 400,
      code: 'MISSING_SESSION_ID',
      message: 'Sandbox sessionId required for proxy access.',
    });
  }

  const activeKey = `sandbox:active:${sessionId}`;

  try {
    const isActive = await redisClient.get(activeKey);
    if (isActive) {
      await next();
      return;
    }
  } catch (redisErr) {
    logger.warn({ redisErr, sessionId }, 'Redis unavailable for proxy fencing, checking database fallback');
  }

  // Database fallback check (Fail-Secure)
  try {
    const sessionRes = await pool.query(
      `SELECT id, status FROM sandbox_sessions
       WHERE id = $1 AND status IN ('booting', 'ready')`,
      [sessionId]
    );

    if (sessionRes.rowCount && sessionRes.rowCount > 0) {
      // Re-populate hot key in Redis asynchronously
      redisClient.setex(activeKey, 300, 'true').catch(() => {});
      await next();
      return;
    }
  } catch (dbErr) {
    logger.error({ dbErr, sessionId }, 'Database check failed during proxy fencing');
  }

  // Strict Fail-Secure rejection
  throw new AppError({
    status: 404,
    code: 'SANDBOX_TERMINATED',
    message: `Sandbox session '${sessionId}' is not active or has been terminated.`,
    type: 'https://crux.dev/errors/sandbox-terminated',
  });
});
