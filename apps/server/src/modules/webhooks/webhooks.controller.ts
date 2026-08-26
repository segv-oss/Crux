import crypto from 'node:crypto';
import type { Context } from 'hono';
import type { AppEnv } from '../../types/hono.js';
import * as webhooksService from './webhooks.service.js';

export async function handleGitHubWebhook(c: Context<AppEnv>) {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-hub-signature-256');
  const timestamp = c.req.header('x-hub-timestamp');
  const deliveryId = c.req.header('x-github-delivery') || crypto.randomUUID();

  const secretUsed = webhooksService.verifyHmacSignature(
    Buffer.from(rawBody),
    signature,
    timestamp,
  );
  let payload: any = {};
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    payload = {};
  }

  const result = await webhooksService.processWebhookIngress(
    'github',
    deliveryId,
    payload,
    secretUsed,
  );
  const statusCode = result.status === 'buffered_in_stream' ? 202 : 200;
  return c.json(result, statusCode as any);
}

export async function handleLinearWebhook(c: Context<AppEnv>) {
  const rawBody = await c.req.text();
  const signature = c.req.header('linear-signature');
  const deliveryId = c.req.header('linear-delivery') || crypto.randomUUID();

  const secretUsed = webhooksService.verifyHmacSignature(Buffer.from(rawBody), signature);
  let payload: any = {};
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    payload = {};
  }

  const result = await webhooksService.processWebhookIngress(
    'linear',
    deliveryId,
    payload,
    secretUsed,
  );
  const statusCode = result.status === 'buffered_in_stream' ? 202 : 200;
  return c.json(result, statusCode as any);
}

export async function handleSlackWebhook(c: Context<AppEnv>) {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-slack-signature');
  const timestamp = c.req.header('x-slack-request-timestamp');
  const deliveryId = `slack_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

  const secretUsed = webhooksService.verifyHmacSignature(
    Buffer.from(rawBody),
    signature,
    timestamp,
  );
  let payload: any = {};
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    payload = {};
  }

  const result = await webhooksService.processWebhookIngress(
    'slack',
    deliveryId,
    payload,
    secretUsed,
  );
  const statusCode = result.status === 'buffered_in_stream' ? 202 : 200;
  return c.json(result, statusCode as any);
}
