import { Hono } from 'hono';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { githubCallbackQuerySchema } from './auth.schema.js';
import { authenticate } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { AppEnv } from '../../types/hono.js';

export const authRouter = new Hono<AppEnv>();

authRouter.use('*', authRateLimiter);

authRouter.get('/github', authController.initiateGitHub);
authRouter.get(
  '/github/callback',
  validate('query', githubCallbackQuerySchema),
  authController.handleGitHubCallback
);
authRouter.post('/refresh', authController.refreshAccessToken);
authRouter.get('/me', authenticate, authController.getCurrentUser);
authRouter.post('/logout', authenticate, authController.logout);
