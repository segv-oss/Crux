import { Hono } from 'hono';
import * as chatController from './chat.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import {
  listMessagesQuerySchema,
  postMessageBodySchema,
  updateMessageBodySchema,
  messageParamSchema,
} from './chat.schema.js';
import { AppEnv } from '../../types/hono.js';

export const chatRouter = new Hono<AppEnv>();

chatRouter.use('*', authenticate);

chatRouter.get('/', validate('query', listMessagesQuerySchema), chatController.listMessages);
chatRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', postMessageBodySchema),
  chatController.postMessage
);
chatRouter.patch(
  '/:messageId',
  idempotencyGuard(),
  validate('param', messageParamSchema),
  validate('json', updateMessageBodySchema),
  chatController.updateMessage
);
chatRouter.delete(
  '/:messageId',
  idempotencyGuard(),
  validate('param', messageParamSchema),
  chatController.deleteMessage
);
