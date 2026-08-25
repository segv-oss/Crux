import { Hono } from 'hono';
import * as commentsController from './comments.controller.js';
import { validate } from '../../middleware/validate.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import {
  createCommentBodySchema,
  updateCommentBodySchema,
  commentParamSchema,
  prParamsSchema,
} from './prs.schema.js';
import { AppEnv } from '../../types/hono.js';

export const commentsRouter = new Hono<AppEnv>();

commentsRouter.get('/', commentsController.listComments);
commentsRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', createCommentBodySchema),
  commentsController.createComment
);
commentsRouter.patch(
  '/:commentId',
  idempotencyGuard(),
  validate('param', commentParamSchema),
  validate('json', updateCommentBodySchema),
  commentsController.updateComment
);
commentsRouter.delete(
  '/:commentId',
  idempotencyGuard(),
  validate('param', commentParamSchema),
  commentsController.deleteComment
);
