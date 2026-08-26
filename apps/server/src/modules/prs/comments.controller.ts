import type { Context } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import * as commentsService from './comments.service.js';

export async function listComments(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const comments = await commentsService.listPRComments(repoId, prId);
  return c.json(
    {
      data: comments,
      meta: { timestamp: new Date().toISOString() },
    },
    200,
  );
}

export async function createComment(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const userId = c.get('userId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const comment = await commentsService.createComment(repoId, prId, userId, body, orgId);
  return c.json(
    {
      data: comment,
      meta: { timestamp: new Date().toISOString() },
    },
    201,
  );
}

export async function updateComment(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const commentId = c.req.param('commentId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const comment = await commentsService.updateComment(repoId, prId, commentId, body, orgId);
  return c.json(
    {
      data: comment,
      meta: { timestamp: new Date().toISOString() },
    },
    200,
  );
}

export async function deleteComment(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const commentId = c.req.param('commentId')!;
  const orgId = c.get('orgId');
  const expectedVersion = c.req.query('expectedVersion')
    ? Number.parseInt(c.req.query('expectedVersion')!, 10)
    : undefined;

  await commentsService.deleteComment(repoId, prId, commentId, { expectedVersion }, orgId);
  return c.json(
    {
      data: { success: true },
      meta: { timestamp: new Date().toISOString() },
    },
    200,
  );
}
