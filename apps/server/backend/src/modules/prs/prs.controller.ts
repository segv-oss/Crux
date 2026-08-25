import { Context } from 'hono';
import * as prsService from './prs.service.js';
import * as reviewsService from './reviews.service.js';
import * as diffsService from './diffs.service.js';
import { AppEnv } from '../../types/hono.js';

export async function listPRs(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const status = c.req.query('status') as any;
  const reviewDecision = c.req.query('reviewDecision') as any;
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');
  const search = c.req.query('search');
  const direction = (c.req.query('direction') || 'forward') as 'forward' | 'backward';
  const includeDeleted = c.req.query('includeDeleted') === 'true';

  const result = await prsService.listPullRequests(repoId, {
    status,
    reviewDecision,
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

export async function getPR(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const includeDeleted = c.req.query('includeDeleted') === 'true';

  const result = await prsService.getPullRequestDetails(repoId, prId, includeDeleted);
  return c.json(
    {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function updatePR(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const result = await prsService.updatePullRequestMetadata(repoId, prId, body, orgId);
  return c.json(
    {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function submitReview(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const userId = c.get('userId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const result = await reviewsService.submitReview(repoId, prId, userId, body, orgId);
  return c.json(
    {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function dismissReview(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const reviewId = c.req.param('reviewId')!;
  const userId = c.get('userId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const result = await reviewsService.dismissReview(repoId, prId, reviewId, userId, body, orgId);
  return c.json(
    {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function mergePR(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const userId = c.get('userId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const result = await prsService.mergePullRequest(repoId, prId, userId, body, orgId);
  return c.json(
    {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function getDiff(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');

  const result = await diffsService.getDiffSummary(repoId, prId, { limit, cursor });
  return c.json(
    {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function getDiffFile(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const fileIndex = parseInt(c.req.param('fileIndex')!, 10);

  const result = await diffsService.getFileDiffAST(repoId, prId, fileIndex);
  return c.json(
    {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function getRawDiff(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const diffStream = await diffsService.getRawUnifiedDiff(repoId, prId);
  return c.text(diffStream, 200, { 'Content-Type': 'text/plain; charset=utf-8' });
}
