import { Hono } from 'hono';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import type { AppEnv } from '../../types/hono.js';
import * as briefsController from './briefs.controller.js';

export const briefsRouter = new Hono<AppEnv>();

briefsRouter.get('/', briefsController.getBrief);
briefsRouter.post('/', idempotencyGuard(), briefsController.regenerateBrief);
