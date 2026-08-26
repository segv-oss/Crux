import { Socket } from 'socket.io';
import { pool } from '../config/db.js';
import { createLogger } from '../middleware/logger.js';

const logger = createLogger('state-sync');

export async function reconcileClientState(
  socket: Socket,
  prId: string,
  lastSequenceNumber: number
): Promise<void> {
  try {
    // Fetch latest sequence number on PR
    const prRes = await pool.query(
      `SELECT sequence_number FROM pull_requests WHERE id = $1`,
      [prId]
    );

    if (prRes.rowCount === 0) return;

    const currentSeq = parseInt(prRes.rows[0].sequence_number, 10) || 0;
    if (lastSequenceNumber >= currentSeq) {
      return; // Already up to date
    }

    // Query missed events from pr_events
    const eventsRes = await pool.query(
      `SELECT sequence_number, event_type, payload, created_at
       FROM pr_events
       WHERE pr_id = $1 AND sequence_number > $2
       ORDER BY sequence_number ASC
       LIMIT 100`,
      [prId, lastSequenceNumber]
    );

    const missedEvents = eventsRes.rows.map((r) => ({
      sequenceNumber: parseInt(r.sequence_number, 10),
      type: r.event_type,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      createdAt: r.created_at,
    }));

    socket.emit('pr:sync', {
      type: 'incremental',
      currentSequenceNumber: currentSeq,
      events: missedEvents,
    });
  } catch (err) {
    logger.error({ err, prId, lastSequenceNumber }, 'Failed to reconcile client state');
  }
}
