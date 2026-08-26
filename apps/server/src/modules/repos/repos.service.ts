import { pool } from '../../config/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { PaginatedResult, RepositoryDTO } from '../../types/index.js';

export async function listOrgRepositories(
  userId: string,
  options: {
    orgId?: string;
    limit: number;
    cursor?: string;
    direction: 'forward' | 'backward';
    search?: string;
    includeDeleted?: boolean;
  },
): Promise<PaginatedResult<RepositoryDTO>> {
  const { orgId, limit, cursor, direction, search, includeDeleted } = options;

  // 1. If specific orgId requested, verify caller membership
  if (orgId) {
    const memberCheck = await pool.query(
      'SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [orgId, userId],
    );
    if (memberCheck.rowCount === 0) {
      throw new AppError({
        status: 403,
        code: 'FORBIDDEN_TENANT_ACCESS',
        message: `You do not have active membership in organization '${orgId}'.`,
      });
    }
  }

  const conditions: string[] = ['om.user_id = $1', 'om.deleted_at IS NULL'];
  const values: any[] = [userId];
  let paramIdx = 2;

  if (orgId) {
    conditions.push(`r.org_id = $${paramIdx}`);
    values.push(orgId);
    paramIdx += 1;
  }

  if (!includeDeleted) {
    conditions.push('r.deleted_at IS NULL');
  }

  if (search) {
    const sanitized = search.replace(/[%_\\]/g, '\\$&');
    conditions.push(`(r.name ILIKE $${paramIdx} OR r.full_name ILIKE $${paramIdx})`);
    values.push(`%${sanitized}%`);
    paramIdx += 1;
  }

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      if (direction === 'forward') {
        conditions.push(
          `(r.created_at, r.id) < ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`,
        );
      } else {
        conditions.push(
          `(r.created_at, r.id) > ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`,
        );
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
      ? 'ORDER BY r.created_at DESC, r.id DESC'
      : 'ORDER BY r.created_at ASC, r.id ASC';

  values.push(limit + 1);
  const sql = `
    SELECT r.id, r.org_id, r.github_repo_id, r.name, r.full_name, r.default_branch, r.required_approvals, r.is_private, r.deleted_at, r.created_at, r.updated_at
    FROM repositories r
    JOIN org_members om ON om.org_id = r.org_id
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

  const resultItems: RepositoryDTO[] = items.map((r) => ({
    id: r.id,
    orgId: r.org_id,
    githubRepoId: Number.parseInt(r.github_repo_id, 10),
    name: r.name,
    fullName: r.full_name,
    defaultBranch: r.default_branch,
    requiredApprovals: r.required_approvals,
    isPrivate: r.is_private,
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
        ? Buffer.from(JSON.stringify({ v: startItem.createdAt, id: startItem.id })).toString(
            'base64',
          )
        : null,
      endCursor: endItem
        ? Buffer.from(JSON.stringify({ v: endItem.createdAt, id: endItem.id })).toString('base64')
        : null,
      nextCursor:
        hasMore && endItem
          ? Buffer.from(JSON.stringify({ v: endItem.createdAt, id: endItem.id })).toString('base64')
          : null,
    },
  };
}

export async function connectRepository(
  orgId: string,
  body: {
    githubRepoId: number;
    fullName: string;
    name?: string;
    defaultBranch?: string;
    requiredApprovals?: number;
    isPrivate?: boolean;
  },
  userId?: string,
): Promise<RepositoryDTO> {
  if (userId) {
    const authRes = await pool.query(
      `SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2 AND role IN ('owner', 'admin') AND deleted_at IS NULL`,
      [orgId, userId],
    );
    if (authRes.rowCount === 0) {
      throw new AppError({
        status: 403,
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Only organization owners or admins can connect repositories.',
      });
    }
  }

  const repoName = body.name || body.fullName.split('/')[1] || body.fullName;
  const repoId = `repo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const res = await pool.query(
      `INSERT INTO repositories (
         id, org_id, github_repo_id, name, full_name, default_branch, required_approvals, is_private
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, org_id, github_repo_id, name, full_name, default_branch, required_approvals, is_private, deleted_at, created_at, updated_at`,
      [
        repoId,
        orgId,
        body.githubRepoId,
        repoName,
        body.fullName,
        body.defaultBranch || 'main',
        body.requiredApprovals !== undefined ? body.requiredApprovals : 1,
        body.isPrivate || false,
      ],
    );

    const r = res.rows[0];
    return {
      id: r.id,
      orgId: r.org_id,
      githubRepoId: Number.parseInt(r.github_repo_id, 10),
      name: r.name,
      fullName: r.full_name,
      defaultBranch: r.default_branch,
      requiredApprovals: r.required_approvals,
      isPrivate: r.is_private,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
      deletedAt: null,
    };
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError({
        status: 409,
        code: 'REPOSITORY_ALREADY_CONNECTED',
        message: `Repository with githubRepoId ${body.githubRepoId} is already connected in this organization.`,
      });
    }
    throw err;
  }
}

export async function deleteRepository(repoId: string, hard = false): Promise<void> {
  if (hard) {
    const res = await pool.query('DELETE FROM repositories WHERE id = $1 RETURNING id', [repoId]);
    if (res.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'REPOSITORY_NOT_FOUND',
        message: `Repository '${repoId}' not found.`,
      });
    }
  } else {
    const res = await pool.query(
      'UPDATE repositories SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [repoId],
    );
    if (res.rowCount === 0) {
      throw new AppError({
        status: 404,
        code: 'REPOSITORY_NOT_FOUND',
        message: `Repository '${repoId}' not found or already deleted.`,
      });
    }
  }
}

export async function restoreRepository(
  repoId: string,
): Promise<{ success: boolean; restoredAt: string }> {
  // Check if currently active
  const checkRes = await pool.query('SELECT deleted_at FROM repositories WHERE id = $1', [repoId]);
  if (checkRes.rowCount === 0) {
    throw new AppError({
      status: 404,
      code: 'REPOSITORY_NOT_FOUND',
      message: `Repository '${repoId}' not found.`,
    });
  }

  if (!checkRes.rows[0].deleted_at) {
    throw new AppError({
      status: 409,
      code: 'ENTITY_NOT_DELETED',
      message: `Repository '${repoId}' is active and cannot be restored.`,
    });
  }

  const res = await pool.query(
    'UPDATE repositories SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING updated_at',
    [repoId],
  );

  return {
    success: true,
    restoredAt: res.rows[0].updated_at.toISOString(),
  };
}
