import { Context } from 'hono';
import * as tasksService from '../tasks/tasks.service.js';
import { AppEnv } from '../../types/hono.js';

export async function listTasks(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');
  const direction = (c.req.query('direction') || 'forward') as 'forward' | 'backward';

  const result = await tasksService.listPRTasks(repoId, prId, { limit, cursor, direction });
  return c.json(
    {
      data: result.items,
      pagination: {
        limit,
        hasMore: result.pageInfo.hasMore,
        nextCursor: result.pageInfo.nextCursor,
      },
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function createTask(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const task = await tasksService.createPRTask(repoId, prId, body, orgId);
  return c.json(
    {
      data: task,
      meta: { timestamp: new Date().toISOString() },
    },
    201
  );
}

export async function updateTask(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const taskId = c.req.param('taskId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const task = await tasksService.updatePRTask(repoId, prId, taskId, body, orgId);
  return c.json(
    {
      data: task,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function deleteTask(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const taskId = c.req.param('taskId')!;
  const orgId = c.get('orgId');

  await tasksService.deletePRTask(repoId, prId, taskId, orgId);
  return c.json(
    {
      data: { success: true },
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}
