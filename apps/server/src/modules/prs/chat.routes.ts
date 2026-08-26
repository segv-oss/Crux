import { Hono } from 'hono';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import * as chatController from './chat.controller.js';
import { sendMessageBodySchema } from './prs.schema.js';

export const chatRouter = new Hono<AppEnv>();

chatRouter.get('/', chatController.listMessages);
chatRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', sendMessageBodySchema),
  chatController.sendMessage,
);
