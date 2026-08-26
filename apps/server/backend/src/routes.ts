import { Hono } from 'hono';
import { config } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { orgsRouter } from './modules/orgs/orgs.routes.js';
import { reposRouter } from './modules/repos/repos.routes.js';
import { sandboxRouter } from './modules/sandbox/sandbox.routes.js';
import { webhooksRouter } from './modules/webhooks/webhooks.routes.js';
import { AppEnv } from './types/hono.js';

export const apiRouter = new Hono<AppEnv>();

// Health check
apiRouter.get('/health', (c) => {
  return c.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: config.APP_VERSION,
    },
    200
  );
});

// Domain sub-routers
apiRouter.route('/auth', authRouter);
apiRouter.route('/orgs', orgsRouter);
apiRouter.route('/orgs/:orgId/repos', reposRouter);
apiRouter.route('/sandboxes', sandboxRouter);
apiRouter.route('/webhooks', webhooksRouter);
