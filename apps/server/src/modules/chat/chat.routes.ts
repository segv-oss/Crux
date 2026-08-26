import { Hono } from 'hono';
import { authenticate } from '../../middleware/auth.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import * as chatController from './chat.controller.js';
import {
  listMessagesQuerySchema,
  messageParamSchema,
  postMessageBodySchema,
  updateMessageBodySchema,
} from './chat.schema.js';

export const chatRouter = new Hono<AppEnv>();

chatRouter.use('*', authenticate);

chatRouter.get('/', validate('query', listMessagesQuerySchema), chatController.listMessages);
chatRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', postMessageBodySchema),
  chatController.postMessage,
);
chatRouter.patch(
  '/:messageId',
  idempotencyGuard(),
  validate('param', messageParamSchema),
  validate('json', updateMessageBodySchema),
  chatController.updateMessage,
);
chatRouter.delete(
  '/:messageId',
  idempotencyGuard(),
  validate('param', messageParamSchema),
  chatController.deleteMessage,
);
