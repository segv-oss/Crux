import { Hono } from 'hono';
import * as webhooksController from './webhooks.controller.js';
import { webhookIngressLimiter } from '../../middleware/rateLimiter.js';
import { AppEnv } from '../../types/hono.js';

export const webhooksRouter = new Hono<AppEnv>();

webhooksRouter.use('*', webhookIngressLimiter);

webhooksRouter.post('/github', webhooksController.handleGitHubWebhook);
webhooksRouter.post('/linear', webhooksController.handleLinearWebhook);
webhooksRouter.post('/slack', webhooksController.handleSlackWebhook);
