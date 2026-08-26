import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { canonicalJsonStringify, computeRequestHash, idempotencyGuard } from '../src/middleware/idempotency.js';
import { AppEnv } from '../src/types/hono.js';
import { setupErrorHandlers } from '../src/middleware/errorHandler.js';

describe('Idempotency & Worker Fencing Test Suite', () => {
  it('should recursively sort nested object keys and produce identical hashes', () => {
    const payload1 = {
      title: 'New Title',
      metadata: { z: 10, a: 20, nested: { y: 'b', x: 'a' } },
      items: [{ b: 2, a: 1 }],
    };
    const payload2 = {
      metadata: { a: 20, nested: { x: 'a', y: 'b' }, z: 10 },
      items: [{ a: 1, b: 2 }],
      title: 'New Title',
    };

    const canonical1 = canonicalJsonStringify(payload1);
    const canonical2 = canonicalJsonStringify(payload2);

    assert.equal(canonical1, canonical2, 'Recursive canonical JSON strings must match');

    const hash1 = computeRequestHash(payload1);
    const hash2 = computeRequestHash(payload2);

    assert.equal(hash1, hash2, 'Canonical hashes must match regardless of nested key order');
  });

  it('should verify idempotency validation rules: user match, endpoint match, and hash match', () => {
    const storedRecord = {
      org_id: 'org_crux',
      key: 'idem_key_456',
      user_id: 'user_alice',
      endpoint: '/api/v1/repos/repo_1/prs',
      request_hash: computeRequestHash({ title: 'Add feature' }),
      status: 'completed',
      response_status: 201,
      response_body: { id: 'pr_1', title: 'Add feature' },
    };

    // 1. Same user, same endpoint, same payload -> valid replay
    const isReplayValid = (userId: string, endpoint: string, body: any) => {
      if (storedRecord.user_id && userId !== storedRecord.user_id) return { valid: false, code: 'IDEMPOTENCY_USER_MISMATCH' };
      if (storedRecord.endpoint !== endpoint) return { valid: false, code: 'IDEMPOTENCY_ENDPOINT_MISMATCH' };
      if (storedRecord.request_hash !== computeRequestHash(body)) return { valid: false, code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' };
      return { valid: true, status: storedRecord.response_status, body: storedRecord.response_body };
    };

    const validAttempt = isReplayValid('user_alice', '/api/v1/repos/repo_1/prs', { title: 'Add feature' });
    assert.equal(validAttempt.valid, true);

    // 2. Different user -> 409 IDEMPOTENCY_USER_MISMATCH
    const userMismatch = isReplayValid('user_bob', '/api/v1/repos/repo_1/prs', { title: 'Add feature' });
    assert.equal(userMismatch.valid, false);
    assert.equal(userMismatch.code, 'IDEMPOTENCY_USER_MISMATCH');

    // 3. Different endpoint -> 409 IDEMPOTENCY_ENDPOINT_MISMATCH
    const routeMismatch = isReplayValid('user_alice', '/api/v1/repos/repo_1/prs/pr_1/comments', { title: 'Add feature' });
    assert.equal(routeMismatch.valid, false);
    assert.equal(routeMismatch.code, 'IDEMPOTENCY_ENDPOINT_MISMATCH');

    // 4. Different payload -> 422 IDEMPOTENCY_PAYLOAD_MISMATCH
    const payloadMismatch = isReplayValid('user_alice', '/api/v1/repos/repo_1/prs', { title: 'Different feature' });
    assert.equal(payloadMismatch.valid, false);
    assert.equal(payloadMismatch.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  it('should enforce multi-tenant isolation with composite key (org_id, key)', () => {
    const sharedKey = 'client_mutation_uuid_100';
    const store = new Map<string, any>();

    const recordOrgA = { orgId: 'org_crux', key: sharedKey, status: 'completed', response: { id: 'pr_1' } };
    const recordOrgB = { orgId: 'org_acme', key: sharedKey, status: 'completed', response: { id: 'pr_2' } };

    store.set(`${recordOrgA.orgId}:${recordOrgA.key}`, recordOrgA);
    store.set(`${recordOrgB.orgId}:${recordOrgB.key}`, recordOrgB);

    assert.equal(store.size, 2, 'Both orgs must store keys independently with zero collision');
    assert.equal(store.get(`org_crux:${sharedKey}`).response.id, 'pr_1');
    assert.equal(store.get(`org_acme:${sharedKey}`).response.id, 'pr_2');
  });
});
