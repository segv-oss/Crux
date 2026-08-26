import { Hono } from 'hono';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { sandboxLaunchLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import { assertSandboxSessionActive } from './proxyFencing.js';
import * as sandboxController from './sandbox.controller.js';
import {
  createGuestTicketBodySchema,
  guestExchangeBodySchema,
  launchSandboxBodySchema,
  sandboxPRParamsSchema,
  sandboxParamSchema,
} from './sandbox.schema.js';

export const sandboxRouter = new Hono<AppEnv>();

// Public guest exchange route
sandboxRouter.post(
  '/guest-exchange',
  optionalAuth,
  idempotencyGuard(),
  validate('json', guestExchangeBodySchema),
  sandboxController.guestExchange,
);

// Stream logs (SSE)
sandboxRouter.get(
  '/:sessionId/logs/stream',
  assertSandboxSessionActive,
  sandboxController.streamSandboxLogs,
);

// Protected routes
sandboxRouter.post(
  '/',
  authenticate,
  sandboxLaunchLimiter,
  idempotencyGuard(),
  validate('param', sandboxPRParamsSchema),
  validate('json', launchSandboxBodySchema),
  sandboxController.launchSandbox,
);
sandboxRouter.get(
  '/',
  authenticate,
  validate('param', sandboxPRParamsSchema),
  sandboxController.getSandboxStatus,
);
sandboxRouter.post(
  '/guest-ticket',
  authenticate,
  idempotencyGuard(),
  validate('param', sandboxPRParamsSchema),
  validate('json', createGuestTicketBodySchema),
  sandboxController.createGuestTicket,
);
sandboxRouter.delete(
  '/:sessionId',
  authenticate,
  idempotencyGuard(),
  validate('param', sandboxParamSchema),
  sandboxController.deleteSandbox,
);
