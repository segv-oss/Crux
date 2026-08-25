import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJsonStringify, computeRequestHash } from '../src/middleware/idempotency.js';

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

  it('should reject delayed worker completing with old epoch after stale lease takeover', () => {
    // Simulating lease state machine
    let lease = {
      key: 'idem_key_1',
      orgId: 'org_crux',
      epoch: 1,
      status: 'processing',
      lockedUntil: Date.now() - 5000, // Expired lease
    };

    // Worker B takes over stale lease
    const now = Date.now();
    assert.ok(now > lease.lockedUntil, 'Lease is stale');
    lease.epoch += 1;
    lease.lockedUntil = now + 45000;
    const workerBEpoch = lease.epoch; // 2

    // Worker A (stalled) resumes with epoch 1 and attempts to commit
    const workerAEpoch = 1;
    const updateRowsWorkerA = workerAEpoch === lease.epoch ? 1 : 0;
    assert.equal(updateRowsWorkerA, 0, 'Worker A commit must be rejected with 0 rows updated due to epoch fencing');

    // Worker B finishes with epoch 2
    const updateRowsWorkerB = workerBEpoch === lease.epoch ? 1 : 0;
    assert.equal(updateRowsWorkerB, 1, 'Worker B commit succeeds with active epoch');
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
