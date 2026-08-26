import { pool } from '../../config/db.js';
import { allocateSequenceAndJournal, withTransaction } from '../../db/store.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { PRMessageDTO, PaginatedResult } from '../../types/index.js';

export async function listPRMessages(
  repoId: string,
  prId: string,
  options: {
    limit: number;
    cursor?: string;
    direction: 'forward' | 'backward';
  },
): Promise<PaginatedResult<PRMessageDTO>> {
  const { limit, cursor, direction } = options;
  const conditions: string[] = ['m.pr_id = $1', 'm.deleted_at IS NULL'];
  const values: any[] = [prId];
  let paramIdx = 2;

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      if (direction === 'forward') {
        conditions.push(`(m.sent_at, m.id) > ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`);
      } else {
        conditions.push(`(m.sent_at, m.id) < ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`);
      }
      values.push(decoded.v, decoded.id);
      paramIdx += 2;
    } catch {
      throw new AppError({
        status: 400,
        code: 'INVALID_CURSOR',
        message: 'Provided cursor could not be decoded.',
      });
    }
  }

  const orderBy =
    direction === 'forward'
      ? 'ORDER BY m.sent_at ASC, m.id ASC'
      : 'ORDER BY m.sent_at DESC, m.id DESC';

  values.push(limit + 1);
  const sql = `
    SELECT m.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
    FROM pr_messages m
    JOIN pull_requests pr ON pr.id = m.pr_id
    LEFT JOIN users u ON u.id = m.user_id
    WHERE pr.repo_id = $1 AND ${conditions.join(' AND ')}
    ${orderBy}
    LIMIT $${paramIdx}
  `;

  const res = await pool.query(sql, [repoId, ...values]);
  const rows = res.rows;
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  if (direction === 'backward') {
    items.reverse();
  }

  const resultItems: PRMessageDTO[] = items.map((r) => ({
    id: r.id,
    prId: r.pr_id,
    userId: r.user_id,
    user: r.user_id
      ? {
          id: r.user_id,
          name: r.user_name || 'User',
          email: r.user_email || '',
          avatarUrl: r.user_avatar || '',
        }
      : null,
    slackMessageId: r.slack_message_id,
    text: r.text,
    version: r.version,
    sentAt: r.sent_at.toISOString(),
    updatedAt: r.updated_at ? r.updated_at.toISOString() : undefined,
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
  }));

  const startItem = resultItems[0];
  const endItem = resultItems[resultItems.length - 1];

  return {
    items: resultItems,
    pageInfo: {
      hasMore,
      hasPrevious: !!cursor,
      startCursor: startItem
        ? Buffer.from(JSON.stringify({ v: startItem.sentAt, id: startItem.id })).toString('base64')
        : null,
      endCursor: endItem
        ? Buffer.from(JSON.stringify({ v: endItem.sentAt, id: endItem.id })).toString('base64')
        : null,
      nextCursor:
        hasMore && endItem
          ? Buffer.from(JSON.stringify({ v: endItem.sentAt, id: endItem.id })).toString('base64')
          : null,
    },
  };
}

export async function postMessage(
  repoId: string,
  prId: string,
  userId: string,
  body: {
    text: string;
    slackMessageId?: string;
    userName?: string;
    userAvatarUrl?: string;
  },
  orgId?: string,
): Promise<PRMessageDTO> {
  return withTransaction(async (client) => {
    const prRes = await client.query(
      'SELECT id FROM pull_requests WHERE repo_id = $1 AND id = $2 AND deleted_at IS NULL',
      [repoId, prId],
    );

    if (prRes.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'PR_NOT_FOUND',
        message: `Pull Request '${prId}' not found.`,
      });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const res = await client.query(
      `INSERT INTO pr_messages (
         id, pr_id, user_id, slack_message_id, text, version, sent_at
       ) VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP)
       RETURNING *`,
      [messageId, prId, userId, body.slackMessageId || null, body.text],
    );

    const saved = res.rows[0];

    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'message:new',
      payload: { messageId: saved.id, text: saved.text, userId },
    });

    return {
      id: saved.id,
      prId: saved.pr_id,
      userId: saved.user_id,
      slackMessageId: saved.slack_message_id,
      text: saved.text,
      version: saved.version,
      sentAt: saved.sent_at.toISOString(),
      updatedAt: saved.updated_at ? saved.updated_at.toISOString() : undefined,
    };
  });
}

export async function updateMessage(
  repoId: string,
  prId: string,
  messageId: string,
  body: {
    text?: string;
    expectedVersion?: number;
  },
  orgId?: string,
): Promise<PRMessageDTO> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `SELECT m.* FROM pr_messages m
       JOIN pull_requests pr ON pr.id = m.pr_id
       WHERE pr.repo_id = $1 AND m.pr_id = $2 AND m.id = $3 AND m.deleted_at IS NULL
       FOR UPDATE`,
      [repoId, prId, messageId],
    );

    if (res.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'MESSAGE_NOT_FOUND_ON_PR',
        message: `Message '${messageId}' not found on pull request '${prId}'.`,
      });
    }

    const current = res.rows[0];
    if (body.expectedVersion && current.version !== body.expectedVersion) {
      throw new AppError({
        status: 409,
        code: 'OPTIMISTIC_LOCK_CONFLICT',
        message: `Version conflict: Expected version ${body.expectedVersion}, but message is at version ${current.version}.`,
      });
    }

    const nextVersion = current.version + 1;
    const textToSet = body.text !== undefined ? body.text : current.text;
    const updateRes = await client.query(
      `UPDATE pr_messages
       SET text = $1, version = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [textToSet, nextVersion, messageId],
    );

    const updated = updateRes.rows[0];

    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'message:updated',
      payload: { messageId, text: textToSet, version: nextVersion },
    });

    return {
      id: updated.id,
      prId: updated.pr_id,
      userId: updated.user_id,
      slackMessageId: updated.slack_message_id,
      text: updated.text,
      version: updated.version,
      sentAt: updated.sent_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };
  });
}

export async function deleteMessage(
  repoId: string,
  prId: string,
  messageId: string,
  orgId?: string,
): Promise<{ success: boolean; messageId: string }> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `SELECT m.* FROM pr_messages m
       JOIN pull_requests pr ON pr.id = m.pr_id
       WHERE pr.repo_id = $1 AND m.pr_id = $2 AND m.id = $3 AND m.deleted_at IS NULL
       FOR UPDATE`,
      [repoId, prId, messageId],
    );

    if (res.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'MESSAGE_NOT_FOUND_ON_PR',
        message: `Message '${messageId}' not found.`,
      });
    }

    await client.query(
      'UPDATE pr_messages SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [messageId],
    );

    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'message:deleted',
      payload: { messageId },
    });

    return { success: true, messageId };
  });
}

export const sendPRMessage = postMessage;
export const updatePRMessage = updateMessage;
export const deletePRMessage = deleteMessage;
