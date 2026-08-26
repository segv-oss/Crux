import { Hono } from 'hono';
import { authenticate } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import * as authController from './auth.controller.js';
import { githubCallbackQuerySchema } from './auth.schema.js';

export const authRouter = new Hono<AppEnv>();

authRouter.use('*', authRateLimiter);

authRouter.get('/github', authController.initiateGitHub);
authRouter.get(
  '/github/callback',
  validate('query', githubCallbackQuerySchema),
  authController.handleGitHubCallback,
);
authRouter.get('/dev-token', authController.getDevToken);
authRouter.post('/refresh', authController.refreshAccessToken);
authRouter.get('/me', authenticate, authController.getCurrentUser);
authRouter.post('/logout', authenticate, authController.logout);
