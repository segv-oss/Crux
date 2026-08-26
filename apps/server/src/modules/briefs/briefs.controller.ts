import type { Context } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import * as briefsService from './briefs.service.js';

export async function getBrief(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;

  const brief = await briefsService.getPRBrief(repoId, prId);
  return c.json(
    {
      data: brief,
      meta: { timestamp: new Date().toISOString() },
    },
    200,
  );
}

export async function triggerReAnalysis(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const orgId = c.get('orgId');

  const brief = await briefsService.regeneratePRBrief(repoId, prId, orgId);
  return c.json(
    {
      data: brief,
      meta: { timestamp: new Date().toISOString() },
    },
    200,
  );
}
