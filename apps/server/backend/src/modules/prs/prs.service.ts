import pg from 'pg';
import { pool } from '../../config/db.js';
import { withTransaction, allocateSequenceAndJournal } from '../../db/store.js';
import { PullRequestDTO, PaginatedResult, PRStatus, PRReviewDecision } from '../../types/index.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function listPullRequests(
  repoId: string,
  options: {
    status?: PRStatus | 'all';
    reviewDecision?: PRReviewDecision | 'all';
    search?: string;
    limit: number;
    cursor?: string;
    direction: 'forward' | 'backward';
    includeDeleted?: boolean;
  }
): Promise<PaginatedResult<PullRequestDTO>> {
  const { status, reviewDecision, search, limit, cursor, direction, includeDeleted } = options;
  const conditions: string[] = ['pr.repo_id = $1'];
  const values: any[] = [repoId];
  let paramIdx = 2;

  if (!includeDeleted) {
    conditions.push('pr.deleted_at IS NULL');
  }

  if (status && status !== 'all') {
    conditions.push(`pr.status = $${paramIdx}`);
    values.push(status);
    paramIdx += 1;
  }

  if (reviewDecision && reviewDecision !== 'all') {
    conditions.push(`pr.review_decision = $${paramIdx}`);
    values.push(reviewDecision);
    paramIdx += 1;
  }

  if (search) {
    const sanitized = search.replace(/[%_\\]/g, '\\$&');
    conditions.push(`(pr.title ILIKE $${paramIdx} OR pr.branch ILIKE $${paramIdx})`);
    values.push(`%${sanitized}%`);
    paramIdx += 1;
  }

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      if (direction === 'forward') {
        conditions.push(`(pr.created_at, pr.id) < ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`);
      } else {
        conditions.push(`(pr.created_at, pr.id) > ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`);
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

  const orderBy = direction === 'forward'
    ? 'ORDER BY pr.created_at DESC, pr.id DESC'
    : 'ORDER BY pr.created_at ASC, pr.id ASC';

  values.push(limit + 1);
  const sql = `
    SELECT pr.*, u.name as author_name, u.email as author_email, u.avatar_url as author_avatar,
           mb.name as merged_by_name
    FROM pull_requests pr
    LEFT JOIN users u ON u.id = pr.author_id
    LEFT JOIN users mb ON mb.id = pr.merged_by_id
    WHERE ${conditions.join(' AND ')}
    ${orderBy}
    LIMIT $${paramIdx}
  `;

  const res = await pool.query(sql, values);
  const rows = res.rows;
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  if (direction === 'backward') {
    items.reverse();
  }

  const resultItems: PullRequestDTO[] = items.map((r) => ({
    id: r.id,
    repoId: r.repo_id,
    authorId: r.author_id,
    author: r.author_id ? {
      id: r.author_id,
      name: r.author_name || 'Unknown',
      email: r.author_email || '',
      avatarUrl: r.author_avatar || '',
    } : null,
    number: r.number,
    title: r.title,
    headSha: r.head_sha,
    branch: r.branch,
    targetBranch: r.target_branch,
    status: r.status,
    reviewDecision: r.review_decision,
    checks: r.checks,
    version: r.version,
    sequenceNumber: parseInt(r.sequence_number, 10),
    additions: r.additions,
    deletions: r.deletions,
    filesChanged: r.files_changed,
    description: r.description,
    mergedAt: r.merged_at ? r.merged_at.toISOString() : null,
    mergedById: r.merged_by_id,
    mergedBy: r.merged_by_id ? { id: r.merged_by_id, name: r.merged_by_name || 'Admin' } : null,
    mergeCommitSha: r.merge_commit_sha,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
  }));

  const startItem = resultItems[0];
  const endItem = resultItems[resultItems.length - 1];

  return {
    items: resultItems,
    pageInfo: {
      hasMore,
      startCursor: startItem
        ? Buffer.from(JSON.stringify({ v: startItem.createdAt, id: startItem.id })).toString('base64')
        : null,
      endCursor: endItem
        ? Buffer.from(JSON.stringify({ v: endItem.createdAt, id: endItem.id })).toString('base64')
        : null,
      nextCursor: hasMore && endItem
        ? Buffer.from(JSON.stringify({ v: endItem.createdAt, id: endItem.id })).toString('base64')
        : null,
    },
  };
}

export async function getPullRequestDetailsWithClient(
  queryExecutor: pg.PoolClient | typeof pool,
  repoId: string,
  prId: string,
  includeDeleted: boolean = false
): Promise<PullRequestDTO> {
  const conditions = ['pr.repo_id = $1 AND pr.id = $2'];
  if (!includeDeleted) {
    conditions.push('pr.deleted_at IS NULL');
  }

  const res = await queryExecutor.query(
    `SELECT pr.*, u.name as author_name, u.email as author_email, u.avatar_url as author_avatar,
            mb.name as merged_by_name
     FROM pull_requests pr
     LEFT JOIN users u ON u.id = pr.author_id
     LEFT JOIN users mb ON mb.id = pr.merged_by_id
     WHERE ${conditions.join(' AND ')}`,
    [repoId, prId]
  );

  if (res.rowCount === 0) {
    throw new AppError({
      status: 404,
      code: 'PR_NOT_FOUND',
      message: `Pull Request '${prId}' not found in repository '${repoId}'.`,
    });
  }

  const r = res.rows[0];
  return {
    id: r.id,
    repoId: r.repo_id,
    authorId: r.author_id,
    author: r.author_id ? {
      id: r.author_id,
      name: r.author_name || 'Unknown',
      email: r.author_email || '',
      avatarUrl: r.author_avatar || '',
    } : null,
    number: r.number,
    title: r.title,
    headSha: r.head_sha,
    branch: r.branch,
    targetBranch: r.target_branch,
    status: r.status,
    reviewDecision: r.review_decision,
    checks: r.checks,
    version: r.version,
    sequenceNumber: parseInt(r.sequence_number, 10),
    additions: r.additions,
    deletions: r.deletions,
    filesChanged: r.files_changed,
    description: r.description,
    mergedAt: r.merged_at ? r.merged_at.toISOString() : null,
    mergedById: r.merged_by_id,
    mergedBy: r.merged_by_id ? { id: r.merged_by_id, name: r.merged_by_name || 'Admin' } : null,
    mergeCommitSha: r.merge_commit_sha,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
  };
}

export async function getPullRequestDetails(
  repoId: string,
  prId: string,
  includeDeleted: boolean = false
): Promise<PullRequestDTO> {
  return getPullRequestDetailsWithClient(pool, repoId, prId, includeDeleted);
}

export async function updatePullRequestMetadata(
  repoId: string,
  prId: string,
  body: {
    title?: string;
    description?: string;
    targetBranch?: string;
    expectedVersion: number;
  },
  orgId?: string
): Promise<PullRequestDTO> {
  return withTransaction(async (client) => {
    // Lock row
    const checkRes = await client.query(
      `SELECT id, version, title, description, target_branch FROM pull_requests
       WHERE repo_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [repoId, prId]
    );

    if (checkRes.rowCount === 0) {
      throw new AppError({ status: 404, code: 'PR_NOT_FOUND', message: `Pull Request '${prId}' not found.` });
    }

    const currentVersion = checkRes.rows[0].version;
    if (currentVersion !== body.expectedVersion) {
      throw new AppError({
        status: 409,
        code: 'OPTIMISTIC_LOCK_CONFLICT',
        message: `Version conflict: Expected version ${body.expectedVersion}, but PR is at version ${currentVersion}.`,
      });
    }

    const newTitle = body.title !== undefined ? body.title : checkRes.rows[0].title;
    const newDesc = body.description !== undefined ? body.description : checkRes.rows[0].description;
    const newTarget = body.targetBranch !== undefined ? body.targetBranch : checkRes.rows[0].target_branch;

    await client.query(
      `UPDATE pull_requests
       SET title = $1, description = $2, target_branch = $3
       WHERE id = $4`,
      [newTitle, newDesc, newTarget, prId]
    );

    const seqResult = await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'pr:updated',
      payload: { title: newTitle, description: newDesc, targetBranch: newTarget },
    });

    // Query on transactional client directly
    const fullPR = await getPullRequestDetailsWithClient(client, repoId, prId);
    fullPR.version = seqResult.version;
    fullPR.sequenceNumber = seqResult.sequenceNumber;
    return fullPR;
  });
}

export async function mergePullRequest(
  repoId: string,
  prId: string,
  userId: string,
  body: {
    expectedHeadSha: string;
    expectedVersion: number;
    mergeMethod: 'squash' | 'merge' | 'rebase';
    commitTitle: string;
    commitMessage?: string;
  },
  orgId?: string
): Promise<PullRequestDTO> {
  return withTransaction(async (client) => {
    const prRes = await client.query(
      `SELECT id, head_sha, version, review_decision, status, sequence_number
       FROM pull_requests WHERE repo_id = $1 AND id = $2 AND deleted_at IS NULL FOR UPDATE`,
      [repoId, prId]
    );

    if (prRes.rowCount === 0) {
      throw new AppError({ status: 404, code: 'PR_NOT_FOUND', message: `Pull Request '${prId}' not found.` });
    }

    const pr = prRes.rows[0];

    if (pr.status === 'merged') {
      throw new AppError({ status: 409, code: 'PR_ALREADY_MERGED', message: 'Pull request is already merged.' });
    }

    if (pr.head_sha !== body.expectedHeadSha) {
      throw new AppError({
        status: 409,
        code: 'PR_HEAD_SHA_MISMATCH',
        message: `Head SHA mismatch: Expected ${body.expectedHeadSha}, but PR is at ${pr.head_sha}.`,
      });
    }

    if (pr.version !== body.expectedVersion) {
      throw new AppError({
        status: 409,
        code: 'OPTIMISTIC_LOCK_CONFLICT',
        message: `Version conflict: Expected version ${body.expectedVersion}, but PR is at ${pr.version}.`,
      });
    }

    if (pr.review_decision !== 'approved' && pr.review_decision !== 'not_required') {
      throw new AppError({
        status: 422,
        code: 'MERGE_BLOCKED_BY_REVIEW',
        message: `Cannot merge PR: review status is '${pr.review_decision}'. Required peer approvals threshold not met.`,
      });
    }

    const mergeCommitSha = `merge_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

    await client.query(
      `UPDATE pull_requests
       SET status = 'merged',
           merged_at = CURRENT_TIMESTAMP,
           merged_by_id = $1,
           merge_commit_sha = $2
       WHERE id = $3`,
      [userId, mergeCommitSha, prId]
    );

    const seqResult = await allocateSequenceAndJournal(client, {
      prId,
      orgId,
      repoId,
      eventType: 'pr:merged',
      payload: {
        mergedAt: new Date().toISOString(),
        mergedById: userId,
        mergeCommitSha,
        mergeMethod: body.mergeMethod,
        commitTitle: body.commitTitle,
      },
    });

    // Query on transactional client directly
    const fullPR = await getPullRequestDetailsWithClient(client, repoId, prId);
    fullPR.status = 'merged';
    fullPR.mergedAt = new Date().toISOString();
    fullPR.mergedById = userId;
    fullPR.mergeCommitSha = mergeCommitSha;
    fullPR.version = seqResult.version;
    fullPR.sequenceNumber = seqResult.sequenceNumber;
    return fullPR;
  });
}
