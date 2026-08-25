import { Context } from 'hono';
import * as reposService from './repos.service.js';
import { AppError } from '../../middleware/errorHandler.js';
import { AppEnv } from '../../types/hono.js';

export async function listRepos(c: Context<AppEnv>) {
  const userId = c.get('userId')!;
  const orgId = c.req.param('orgId') || (c.req.query('orgId') as string | undefined);
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');
  const search = c.req.query('search');
  const direction = (c.req.query('direction') || 'forward') as 'forward' | 'backward';
  const includeDeleted = c.req.query('includeDeleted') === 'true';

  const result = await reposService.listOrgRepositories(userId, {
    orgId,
    limit,
    cursor,
    search,
    direction,
    includeDeleted,
  });

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

export async function connectRepo(c: Context<AppEnv>) {
  const orgId = c.req.param('orgId') || c.get('orgId');
  if (!orgId) {
    throw new AppError({
      status: 400,
      code: 'ORGANIZATION_ID_REQUIRED',
      message: 'Organization ID is required to connect a repository.',
    });
  }
  const userId = c.get('userId');
  const body = await c.req.json();
  const repo = await reposService.connectRepository(orgId, body, userId);
  return c.json(
    {
      data: repo,
      meta: { timestamp: new Date().toISOString() },
    },
    201
  );
}

export async function deleteRepo(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const permanent = c.req.query('permanent') === 'true';

  await reposService.deleteRepository(repoId, permanent);
  return c.json(
    {
      data: { success: true },
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function restoreRepo(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;

  const repo = await reposService.restoreRepository(repoId);
  return c.json(
    {
      data: repo,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}
