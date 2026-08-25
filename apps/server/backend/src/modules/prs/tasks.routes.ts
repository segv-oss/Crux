import { Hono } from 'hono';
import * as tasksController from './tasks.controller.js';
import { validate } from '../../middleware/validate.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import {
  createTaskBodySchema,
  updateTaskBodySchema,
  taskParamSchema,
} from './prs.schema.js';
import { AppEnv } from '../../types/hono.js';

export const tasksRouter = new Hono<AppEnv>();

tasksRouter.get('/', tasksController.listTasks);
tasksRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', createTaskBodySchema),
  tasksController.createTask
);
tasksRouter.patch(
  '/:taskId',
  idempotencyGuard(),
  validate('param', taskParamSchema),
  validate('json', updateTaskBodySchema),
  tasksController.updateTask
);
tasksRouter.delete(
  '/:taskId',
  idempotencyGuard(),
  validate('param', taskParamSchema),
  tasksController.deleteTask
);
