import { Hono } from 'hono';
import * as briefsController from './briefs.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { AppEnv } from '../../types/hono.js';

export const briefsRouter = new Hono<AppEnv>();

briefsRouter.use('*', authenticate);

briefsRouter.get('/', briefsController.getBrief);
briefsRouter.post('/', idempotencyGuard(), briefsController.triggerReAnalysis);
