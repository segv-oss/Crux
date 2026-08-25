import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyHmacSignature } from '../src/modules/webhooks/webhooks.service.js';
import { config } from '../src/config/env.js';

describe('Webhook Ingress & Secret Rotation Test Suite', () => {
  it('should validate signatures against both primary and fallback secrets using verifyHmacSignature', () => {
    const rawPayload = Buffer.from(JSON.stringify({ action: 'opened', number: 342 }));

    // 1. Signed with Primary Secret
    const primarySig = crypto.createHmac('sha256', config.PRIMARY_WEBHOOK_SECRET).update(rawPayload).digest('hex');
    const secretType1 = verifyHmacSignature(rawPayload, `sha256=${primarySig}`);
    assert.equal(secretType1, 'PRIMARY', 'Primary signature verified by service');

    // 2. Signed with Fallback Secret during rotation window
    const fallbackSig = crypto.createHmac('sha256', config.FALLBACK_WEBHOOK_SECRET).update(rawPayload).digest('hex');
    const secretType2 = verifyHmacSignature(rawPayload, `sha256=${fallbackSig}`);
    assert.equal(secretType2, 'FALLBACK', 'Fallback signature verified for zero-downtime rotation');
  });

  it('should reject webhook requests with timestamp skew greater than 300 seconds', () => {
    const rawPayload = Buffer.from(JSON.stringify({ ping: true }));
    const primarySig = crypto.createHmac('sha256', config.PRIMARY_WEBHOOK_SECRET).update(rawPayload).digest('hex');

    const staleTimestampSeconds = Math.floor((Date.now() - 400000) / 1000).toString(); // 400s in the past

    assert.throws(
      () => {
        verifyHmacSignature(rawPayload, `sha256=${primarySig}`, staleTimestampSeconds);
      },
      (err: any) => {
        return err.code === 'WEBHOOK_TIMESTAMP_EXPIRED' && err.status === 400;
      },
      'Must throw AppError with 400 WEBHOOK_TIMESTAMP_EXPIRED'
    );
  });
});
