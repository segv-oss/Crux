import type { Context } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import * as chatService from '../chat/chat.service.js';

export async function listMessages(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const limit = Number.parseInt(c.req.query('limit') || '50', 10);
  const cursor = c.req.query('cursor');
  const direction = (c.req.query('direction') || 'forward') as 'forward' | 'backward';

  const result = await chatService.listPRMessages(repoId, prId, { limit, cursor, direction });
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

export async function sendMessage(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const userId = c.get('userId')!;
  const orgId = c.get('orgId');
  const body = await c.req.json();

  const message = await chatService.sendPRMessage(repoId, prId, userId, body, orgId);

  return c.json(
    {
      data: message,
      meta: { timestamp: new Date().toISOString() },
    },
    201,
  );
}
