import { Context } from 'hono';
import * as sandboxService from './sandbox.service.js';
import { streamSSE } from 'hono/streaming';
import { AppEnv } from '../../types/hono.js';

export async function launchSandbox(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const userId = c.get('userId')!;
  const body = await c.req.json();

  const session = await sandboxService.launchSandbox(repoId, prId, userId, body);
  return c.json(
    {
      data: session,
      meta: { timestamp: new Date().toISOString() },
    },
    201
  );
}

export async function getSandboxStatus(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const sessionId = c.req.param('sessionId') || (c.req.query('sessionId') as string) || 'active';

  const status = await sandboxService.getSandboxStatus(repoId, prId, sessionId);
  return c.json(
    {
      data: status,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function createGuestTicket(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const sessionId = c.req.param('sessionId') || (c.req.query('sessionId') as string) || 'active';
  const userId = c.get('userId')!;
  const body = await c.req.json();

  const ticket = await sandboxService.createGuestTicket(repoId, prId, sessionId, body);
  return c.json(
    {
      data: ticket,
      meta: { timestamp: new Date().toISOString() },
    },
    201
  );
}

export async function guestExchange(c: Context<AppEnv>) {
  const body = await c.req.json();
  const session = await sandboxService.exchangeGuestTicket(body.ticket);
  return c.json(
    {
      data: session,
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function deleteSandbox(c: Context<AppEnv>) {
  const repoId = c.req.param('repoId')!;
  const prId = c.req.param('prId')!;
  const sessionId = c.req.param('sessionId')!;

  await sandboxService.deleteSandbox(repoId, prId, sessionId);
  return c.json(
    {
      data: { success: true },
      meta: { timestamp: new Date().toISOString() },
    },
    200
  );
}

export async function streamSandboxLogs(c: Context<AppEnv>) {
  const sessionId = c.req.param('sessionId') || 'unknown';

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ status: 'streaming', sessionId }),
    });

    let count = 0;
    const interval = setInterval(async () => {
      count++;
      try {
        await stream.writeSSE({
          event: 'log',
          data: JSON.stringify({
            timestamp: new Date().toISOString(),
            line: `[MicroVM ${sessionId}] Heartbeat frame ${count}`,
          }),
        });
      } catch {
        clearInterval(interval);
      }
    }, 15000);

    stream.onAbort(() => {
      clearInterval(interval);
    });

    try {
      await stream.sleep(60000);
    } finally {
      clearInterval(interval);
    }
  });
}
