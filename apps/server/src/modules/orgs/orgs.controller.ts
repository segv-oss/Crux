import type { Context } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import * as orgsService from './orgs.service.js';

export async function listOrgs(c: Context<AppEnv>) {
  const userId = c.get('userId')!;
  const limit = Number.parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');
  const direction = (c.req.query('direction') || 'forward') as 'forward' | 'backward';
  const includeDeleted = c.req.query('includeDeleted') === 'true';

  const result = await orgsService.listUserOrganizations(userId, {
    limit,
    cursor,
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
    200,
  );
}

export async function createOrg(c: Context<AppEnv>) {
  const userId = c.get('userId')!;
  const body = await c.req.json();
  const org = await orgsService.createOrganization(userId, body);
  return c.json(
    {
      data: org,
      meta: { timestamp: new Date().toISOString() },
    },
    201,
  );
}

export async function listOrgMembers(c: Context<AppEnv>) {
  const orgId = c.req.param('orgId')!;
  const userId = c.get('userId')!;
  const members = await orgsService.getOrganizationMembers(orgId, userId);
  return c.json(
    {
      data: members,
      meta: { timestamp: new Date().toISOString() },
    },
    200,
  );
}

export async function inviteOrgMember(c: Context<AppEnv>) {
  const orgId = c.req.param('orgId')!;
  const userId = c.get('userId')!;
  const body = await c.req.json();
  const member = await orgsService.inviteMember(orgId, userId, body);
  return c.json(
    {
      data: member,
      meta: { timestamp: new Date().toISOString() },
    },
    201,
  );
}
