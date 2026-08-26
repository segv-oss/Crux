import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { config } from './config/env.js';
import { setupErrorHandlers } from './middleware/errorHandler.js';
import { createLogger } from './middleware/logger.js';
import { apiRouter } from './routes.js';
import type { AppEnv } from './types/hono.js';

const logger = createLogger('http');

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // 1. Security Headers
  app.use('*', secureHeaders());

  // 2. CORS Policy
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (config.CORS_ORIGIN === '*') return origin || '*';
        if (config.CORS_ORIGIN === origin) return origin;
        return config.CORS_ORIGIN;
      },
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'Idempotency-Key',
        'x-hub-signature-256',
        'linear-signature',
        'x-slack-signature',
        'x-hub-timestamp',
        'x-slack-request-timestamp',
        'x-github-delivery',
      ],
      exposeHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Idempotency-Status',
      ],
    }),
  );

  // 3. Request Logger & Trace ID
  app.use('*', async (c, next) => {
    const start = Date.now();
    const incomingReqId = c.req.header('x-crux-request-id') || c.req.header('x-request-id');
    const reqId =
      incomingReqId && incomingReqId.trim().length > 0 ? incomingReqId.trim() : crypto.randomUUID();
    c.header('x-request-id', reqId);
    c.header('x-crux-request-id', reqId);

    await next();

    const elapsed = Date.now() - start;
    logger.info(
      {
        reqId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: elapsed,
      },
      'request completed',
    );
  });

  // 4. Root Welcome & Health
  app.get('/', (c) => {
    return c.json(
      {
        name: 'Crux Backend API Service',
        version: config.APP_VERSION,
        status: 'online',
        docs: 'packages/api-contract/contract.md',
      },
      200,
    );
  });

  // 5. Mount API Routes under /api/v1
  app.route('/api/v1', apiRouter);

  // 6. Global RFC 7807 Error & Not Found Handlers
  setupErrorHandlers(app);

  return app;
}
