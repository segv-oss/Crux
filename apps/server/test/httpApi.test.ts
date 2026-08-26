import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';

describe('HTTP API & Middleware Integration Test Suite (Hono Native Fetch)', () => {
  const app = createApp();

  it('GET / should return online status, APP_VERSION, and contract link', async () => {
    const res = await app.request('/');
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.name, 'Crux Backend API Service');
    assert.equal(body.version, config.APP_VERSION);
    assert.equal(body.status, 'online');
    assert.equal(body.docs, 'packages/api-contract/contract.md');
  });

  it('GET /api/v1/health should honor incoming x-crux-request-id and return healthy status', async () => {
    const customTraceId = 'trace_custom_uuid_987654';
    const res = await app.request('/api/v1/health', {
      headers: {
        'x-crux-request-id': customTraceId,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get('x-crux-request-id'),
      customTraceId,
      'Must honor incoming x-crux-request-id',
    );
    assert.equal(
      res.headers.get('x-request-id'),
      customTraceId,
      'Must mirror x-crux-request-id to x-request-id',
    );

    const body = (await res.json()) as any;
    assert.equal(body.status, 'healthy');
    assert.equal(body.version, config.APP_VERSION);
    assert.ok(body.timestamp);
  });

  it('GET /api/v1/orgs without Bearer token should return 401 RFC 7807 problem details', async () => {
    const res = await app.request('/api/v1/orgs');
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    const body = (await res.json()) as any;
    assert.equal(body.code, 'UNAUTHORIZED');
    assert.ok(body.detail);
    assert.ok(body.timestamp);
  });

  it('POST /api/v1/webhooks/github should reject missing signature header with 400', async () => {
    const res = await app.request('/api/v1/webhooks/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'ping' }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    const body = (await res.json()) as any;
    assert.equal(body.code, 'MISSING_WEBHOOK_SIGNATURE');
  });

  it('POST /api/v1/webhooks/github should reject invalid HMAC signature with 401', async () => {
    const res = await app.request('/api/v1/webhooks/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256':
          'sha256=invalid_hex_signature_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
      body: JSON.stringify({ action: 'ping' }),
    });

    assert.equal(res.status, 401);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    const body = (await res.json()) as any;
    assert.equal(body.code, 'INVALID_WEBHOOK_SIGNATURE');
  });

  it('GET /api/v1/auth/github/callback without code query param should return 422 INVALID_PARAMS', async () => {
    const res = await app.request('/api/v1/auth/github/callback');
    assert.equal(res.status, 422);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    const body = (await res.json()) as any;
    assert.equal(body.code, 'INVALID_PARAMS');
    assert.ok(Array.isArray(body.invalid_params));
    assert.equal(body.invalid_params[0].name, 'code');
  });

  it('POST /api/v1/auth/refresh without token should return 401 UNAUTHORIZED', async () => {
    const res = await app.request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 401);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    const body = (await res.json()) as any;
    assert.equal(body.code, 'UNAUTHORIZED');
  });

  it('POST /api/v1/orgs/:orgId/repos/:repoId/prs/:prId/merge without auth should return 401 UNAUTHORIZED', async () => {
    const res = await app.request('/api/v1/orgs/org_1/repos/repo_1/prs/pr_1/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expectedHeadSha: 'abc', expectedVersion: 1 }),
    });

    assert.equal(res.status, 401);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    const body = (await res.json()) as any;
    assert.equal(body.code, 'UNAUTHORIZED');
  });
});
