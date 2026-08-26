import type pg from 'pg';
import { pool } from '../../config/db.js';
import { allocateSequenceAndJournal, withTransaction } from '../../db/store.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { PRCommentDTO } from '../../types/index.js';

async function getCommentDepthWithClient(
  client: pg.PoolClient | typeof pool,
  parentCommentId: string | null | undefined,
): Promise<number> {
  if (!parentCommentId) return 0;

  let depth = 1;
  let currentParentId: string | null = parentCommentId;

  while (currentParentId) {
    const queryRes: any = await client.query(
      'SELECT parent_comment_id FROM pr_comments WHERE id = $1 FOR SHARE',
      [currentParentId],
    );

    if (queryRes.rowCount === 0) break;
    currentParentId = queryRes.rows[0].parent_comment_id;
    if (currentParentId) {
      depth += 1;
      if (depth > 5) break; // Prevent runaway cycles
    }
  }

  return depth;
}

export async function getCommentDepth(parentCommentId: string | null | undefined): Promise<number> {
  return getCommentDepthWithClient(pool, parentCommentId);
}

export async function listPRComments(repoId: string, prId: string): Promise<PRCommentDTO[]> {
  const res = await pool.query(
    `SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
     FROM pr_comments c
     JOIN pull_requests pr ON pr.id = c.pr_id
     LEFT JOIN users u ON u.id = c.user_id
     WHERE pr.repo_id = $1 AND c.pr_id = $2
     ORDER BY c.created_at ASC`,
    [repoId, prId],
  );

  const flatComments: PRCommentDTO[] = res.rows.map((r) => ({
    id: r.id,
    prId: r.pr_id,
    parentCommentId: r.parent_comment_id,
    userId: r.user_id,
    user: r.user_id
      ? {
          id: r.user_id,
          name: r.user_name || 'Contributor',
          email: r.user_email || '',
          avatarUrl: r.user_avatar || '',
        }
      : null,
    filePath: r.file_path,
    lineNumber: r.line_number,
    side: r.side,
    body: r.deleted_at ? '[This comment was deleted]' : r.body,
    version: r.version,
    isDeleted: !!r.deleted_at,
    replies: [],
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
  }));

  // Build recursive tree
  const commentMap = new Map<string, PRCommentDTO>();
  const topLevel: PRCommentDTO[] = [];

  for (const c of flatComments) {
    commentMap.set(c.id, c);
  }

  for (const c of flatComments) {
    if (c.parentCommentId && commentMap.has(c.parentCommentId)) {
      commentMap.get(c.parentCommentId)?.replies?.push(c);
    } else {
      topLevel.push(c);
    }
  }

  return topLevel;
}

export async function createComment(
  repoId: string,
  prId: string,
  userId: string,
  body: {
    parentCommentId?: string | null;
    filePath: string;
    lineNumber: number;
    side?: 'LEFT' | 'RIGHT';
    body: string;
  },
  orgId?: string,
): Promise<PRCommentDTO> {
  return withTransaction(async (client) => {
    // Assert PR exists
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

    // Atomic depth check under transaction lock to eliminate TOCTOU race
    if (body.parentCommentId) {
      const depth = await getCommentDepthWithClient(client, body.parentCommentId);
      if (depth >= 3) {
        throw new AppError({
          status: 422,
          code: 'MAX_COMMENT_DEPTH_EXCEEDED',
          message: 'Comment nesting depth limit of 3 exceeded.',
        });
      }
    }

    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const res = await client.query(
      `INSERT INTO pr_comments (
         id, pr_id, parent_comment_id, user_id, file_path, line_number, side, body, version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
       RETURNING id, pr_id, parent_comment_id, user_id, file_path, line_number, side, body, version, created_at, updated_at`,
      [
        commentId,
        prId,
        body.parentCommentId || null,
        userId,
        body.filePath,
        body.lineNumber,
        body.side || 'RIGHT',
        body.body,
      ],
    );

    const saved = res.rows[0];

    // Journal event
    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'comment:created',
      payload: { commentId: saved.id, filePath: saved.file_path, lineNumber: saved.line_number },
    });

    return {
      id: saved.id,
      prId: saved.pr_id,
      parentCommentId: saved.parent_comment_id,
      userId: saved.user_id,
      filePath: saved.file_path,
      lineNumber: saved.line_number,
      side: saved.side,
      body: saved.body,
      version: saved.version,
      isDeleted: false,
      createdAt: saved.created_at.toISOString(),
      updatedAt: saved.updated_at.toISOString(),
    };
  });
}

export async function updateComment(
  repoId: string,
  prId: string,
  commentId: string,
  body: {
    body: string;
    expectedVersion: number;
  },
  orgId?: string,
): Promise<PRCommentDTO> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `SELECT c.* FROM pr_comments c
       JOIN pull_requests pr ON pr.id = c.pr_id
       WHERE pr.repo_id = $1 AND c.pr_id = $2 AND c.id = $3 AND c.deleted_at IS NULL
       FOR UPDATE`,
      [repoId, prId, commentId],
    );

    if (res.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'COMMENT_NOT_FOUND_ON_PR',
        message: `Comment '${commentId}' not found on pull request '${prId}'.`,
      });
    }

    const current = res.rows[0];
    if (current.version !== body.expectedVersion) {
      throw new AppError({
        status: 409,
        code: 'OPTIMISTIC_LOCK_CONFLICT',
        message: `Version conflict: Expected version ${body.expectedVersion}, but comment is at version ${current.version}.`,
      });
    }

    const nextVersion = current.version + 1;
    const updateRes = await client.query(
      `UPDATE pr_comments
       SET body = $1, version = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [body.body, nextVersion, commentId],
    );

    const updated = updateRes.rows[0];

    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'comment:updated',
      payload: { commentId, version: nextVersion },
    });

    return {
      id: updated.id,
      prId: updated.pr_id,
      parentCommentId: updated.parent_comment_id,
      userId: updated.user_id,
      filePath: updated.file_path,
      lineNumber: updated.line_number,
      side: updated.side,
      body: updated.body,
      version: updated.version,
      isDeleted: false,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString(),
    };
  });
}

export async function deleteComment(
  repoId: string,
  prId: string,
  commentId: string,
  options?: { expectedVersion?: number },
  orgId?: string,
): Promise<{ success: boolean; commentId: string }> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `SELECT c.* FROM pr_comments c
       JOIN pull_requests pr ON pr.id = c.pr_id
       WHERE pr.repo_id = $1 AND c.pr_id = $2 AND c.id = $3 AND c.deleted_at IS NULL
       FOR UPDATE`,
      [repoId, prId, commentId],
    );

    if (res.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'COMMENT_NOT_FOUND_ON_PR',
        message: `Comment '${commentId}' not found on pull request '${prId}'.`,
      });
    }

    const current = res.rows[0];
    if (options?.expectedVersion && current.version !== options.expectedVersion) {
      throw new AppError({
        status: 409,
        code: 'OPTIMISTIC_LOCK_CONFLICT',
        message: `Version conflict: Expected version ${options.expectedVersion}, but comment is at version ${current.version}.`,
      });
    }

    await client.query(
      'UPDATE pr_comments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [commentId],
    );

    await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'comment:deleted',
      payload: { commentId },
    });

    return { success: true, commentId };
  });
}
