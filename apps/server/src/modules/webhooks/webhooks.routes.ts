import { Hono } from 'hono';
import { webhookIngressLimiter } from '../../middleware/rateLimiter.js';
import type { AppEnv } from '../../types/hono.js';
import * as webhooksController from './webhooks.controller.js';

export const webhooksRouter = new Hono<AppEnv>();

webhooksRouter.use('*', webhookIngressLimiter);

webhooksRouter.post('/github', webhooksController.handleGitHubWebhook);
webhooksRouter.post('/linear', webhooksController.handleLinearWebhook);
webhooksRouter.post('/slack', webhooksController.handleSlackWebhook);
