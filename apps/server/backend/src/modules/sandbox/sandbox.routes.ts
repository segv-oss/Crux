import { Hono } from 'hono';
import * as sandboxController from './sandbox.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { assertSandboxSessionActive } from './proxyFencing.js';
import { sandboxLaunchLimiter } from '../../middleware/rateLimiter.js';
import {
  launchSandboxBodySchema,
  createGuestTicketBodySchema,
  guestExchangeBodySchema,
  sandboxPRParamsSchema,
  sandboxParamSchema,
} from './sandbox.schema.js';
import { AppEnv } from '../../types/hono.js';

export const sandboxRouter = new Hono<AppEnv>();

// Public guest exchange route
sandboxRouter.post(
  '/guest-exchange',
  optionalAuth,
  idempotencyGuard(),
  validate('json', guestExchangeBodySchema),
  sandboxController.guestExchange
);

// Stream logs (SSE)
sandboxRouter.get(
  '/:sessionId/logs/stream',
  assertSandboxSessionActive,
  sandboxController.streamSandboxLogs
);

// Protected routes
sandboxRouter.post(
  '/',
  authenticate,
  sandboxLaunchLimiter,
  idempotencyGuard(),
  validate('param', sandboxPRParamsSchema),
  validate('json', launchSandboxBodySchema),
  sandboxController.launchSandbox
);
sandboxRouter.get(
  '/',
  authenticate,
  validate('param', sandboxPRParamsSchema),
  sandboxController.getSandboxStatus
);
sandboxRouter.post(
  '/guest-ticket',
  authenticate,
  idempotencyGuard(),
  validate('param', sandboxPRParamsSchema),
  validate('json', createGuestTicketBodySchema),
  sandboxController.createGuestTicket
);
sandboxRouter.delete(
  '/:sessionId',
  authenticate,
  idempotencyGuard(),
  validate('param', sandboxParamSchema),
  sandboxController.deleteSandbox
);
