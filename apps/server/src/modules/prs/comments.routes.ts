import { Hono } from 'hono';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import * as commentsController from './comments.controller.js';
import {
  commentParamSchema,
  createCommentBodySchema,
  prParamsSchema,
  updateCommentBodySchema,
} from './prs.schema.js';

export const commentsRouter = new Hono<AppEnv>();

commentsRouter.get('/', commentsController.listComments);
commentsRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', createCommentBodySchema),
  commentsController.createComment,
);
commentsRouter.patch(
  '/:commentId',
  idempotencyGuard(),
  validate('param', commentParamSchema),
  validate('json', updateCommentBodySchema),
  commentsController.updateComment,
);
commentsRouter.delete(
  '/:commentId',
  idempotencyGuard(),
  validate('param', commentParamSchema),
  commentsController.deleteComment,
);
