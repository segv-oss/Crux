import { Hono } from 'hono';
import * as chatController from './chat.controller.js';
import { validate } from '../../middleware/validate.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { sendMessageBodySchema } from './prs.schema.js';
import { AppEnv } from '../../types/hono.js';

export const chatRouter = new Hono<AppEnv>();

chatRouter.get('/', chatController.listMessages);
chatRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', sendMessageBodySchema),
  chatController.sendMessage
);
