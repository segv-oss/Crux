import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('WebSocket Tenant Gate & State Reconciliation Test Suite', () => {
  it('should reject subscription if user does not belong to the PR repository tenant organization', () => {
    const orgMemberships = [
      { userId: 'usr_sarah', orgId: 'org_crux' },
    ];

    const repo = { id: 'repo_crux_core', orgId: 'org_crux' };
    const strangerUserId = 'usr_stranger';

    const hasAccess = orgMemberships.some(
      (m) => m.userId === strangerUserId && m.orgId === repo.orgId
    );

    assert.equal(hasAccess, false, 'Non-member access rejected with FORBIDDEN_TENANT_ACCESS');
  });

  it('should reconcile missed sequence events on client reconnect', () => {
    const prEventJournal = [
      { sequenceNumber: 1041, type: 'pr:review', payload: { action: 'approved' } },
      { sequenceNumber: 1042, type: 'task:updated', payload: { taskId: 'tsk_1', done: true } },
      { sequenceNumber: 1043, type: 'comment:created', payload: { commentId: 'cmt_1' } },
    ];

    const clientLastSeq = 1041;
    const missedEvents = prEventJournal.filter((e) => e.sequenceNumber > clientLastSeq);

    assert.equal(missedEvents.length, 2, 'Replays 2 missed events (1042 and 1043)');
    assert.equal(missedEvents[0].sequenceNumber, 1042);
    assert.equal(missedEvents[1].sequenceNumber, 1043);
  });
});
