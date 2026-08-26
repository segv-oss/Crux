import { Hono } from 'hono';
import { authenticate } from '../../middleware/auth.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import * as tasksController from './tasks.controller.js';
import {
  createTaskBodySchema,
  listTasksQuerySchema,
  taskParamSchema,
  updateTaskBodySchema,
} from './tasks.schema.js';

export const tasksRouter = new Hono<AppEnv>();

tasksRouter.use('*', authenticate);

tasksRouter.get('/', validate('query', listTasksQuerySchema), tasksController.listTasks);
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
tasksRouter.post(
  '/:taskId/restore',
  idempotencyGuard(),
  validate('param', taskParamSchema),
  tasksController.restoreTask,
);
