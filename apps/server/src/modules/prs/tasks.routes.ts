import { Hono } from 'hono';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import { createTaskBodySchema, taskParamSchema, updateTaskBodySchema } from './prs.schema.js';
import * as tasksController from './tasks.controller.js';

export const tasksRouter = new Hono<AppEnv>();

tasksRouter.get('/', tasksController.listTasks);
tasksRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', createTaskBodySchema),
  tasksController.createTask,
);
tasksRouter.patch(
  '/:taskId',
  idempotencyGuard(),
  validate('param', taskParamSchema),
  validate('json', updateTaskBodySchema),
  tasksController.updateTask,
);
tasksRouter.delete(
  '/:taskId',
  idempotencyGuard(),
  validate('param', taskParamSchema),
  tasksController.deleteTask,
);
