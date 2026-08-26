import crypto from 'node:crypto';
import { pool } from '../../config/db.js';
import { withTransaction } from '../../db/store.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { OrganizationDTO, PaginatedResult } from '../../types/index.js';

export async function listUserOrganizations(
  userId: string,
  options: {
    limit: number;
    cursor?: string;
    direction: 'forward' | 'backward';
    includeDeleted?: boolean;
  },
): Promise<PaginatedResult<OrganizationDTO>> {
  const { limit, cursor, direction, includeDeleted } = options;
  const conditions: string[] = ['om.user_id = $1'];
  const values: any[] = [userId];
  let paramIdx = 2;

  if (!includeDeleted) {
    conditions.push('o.deleted_at IS NULL AND om.deleted_at IS NULL');
  }

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      if (direction === 'forward') {
        conditions.push(
          `(o.created_at, o.id) < ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`,
        );
      } else {
        conditions.push(
          `(o.created_at, o.id) > ($${paramIdx}::timestamptz, $${paramIdx + 1}::text)`,
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
      ? 'ORDER BY o.created_at DESC, o.id DESC'
      : 'ORDER BY o.created_at ASC, o.id ASC';

  values.push(limit + 1);
  const sql = `
    SELECT o.id, o.github_org_id, o.name, o.slug, o.avatar_url, o.deleted_at, o.created_at, o.updated_at, om.role
    FROM organizations o
    JOIN org_members om ON om.org_id = o.id
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

  const resultItems: OrganizationDTO[] = items.map((r) => ({
    id: r.id,
    githubOrgId: r.github_org_id,
    name: r.name,
    slug: r.slug,
    avatarUrl: r.avatar_url,
    role: r.role,
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

export async function createOrganization(
  userId: string,
  body: { name: string; slug: string; avatarUrl?: string; githubOrgId?: string },
): Promise<OrganizationDTO> {
  const orgId = `org_${crypto.randomUUID().substring(0, 8)}`;

  return withTransaction(async (client) => {
    try {
      const res = await client.query(
        `INSERT INTO organizations (id, name, slug, avatar_url, github_org_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [orgId, body.name, body.slug, body.avatarUrl || null, body.githubOrgId || null],
      );

      await client.query(
        `INSERT INTO org_members (id, org_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [`mem_${crypto.randomUUID().substring(0, 8)}`, orgId, userId],
      );

      const r = res.rows[0];
      return {
        id: r.id,
        githubOrgId: r.github_org_id,
        name: r.name,
        slug: r.slug,
        avatarUrl: r.avatar_url,
        role: 'owner',
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
        deletedAt: null,
      };
    } catch (err: any) {
      if (err.code === '23505') {
        throw new AppError({
          status: 409,
          code: 'SLUG_ALREADY_EXISTS',
          message: `Organization slug '${body.slug}' is already taken.`,
        });
      }
      throw err;
    }
  });
}

export async function getOrganizationMembers(orgId: string, userId: string) {
  return withTransaction(async (client) => {
    const checkRes = await client.query(
      'SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2 AND deleted_at IS NULL FOR SHARE',
      [orgId, userId],
    );
    if (checkRes.rowCount === 0) {
      throw new AppError({
        status: 403,
        code: 'FORBIDDEN_TENANT_ACCESS',
        message: 'You are not a member of this organization.',
      });
    }

    const res = await client.query(
      `SELECT om.id, om.role, om.created_at, u.id as user_id, u.name, u.email, u.avatar_url
       FROM org_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.org_id = $1 AND om.deleted_at IS NULL`,
      [orgId],
    );

    return res.rows.map((r) => ({
      id: r.id,
      role: r.role,
      user: {
        id: r.user_id,
        name: r.name,
        email: r.email,
        avatarUrl: r.avatar_url,
      },
      createdAt: r.created_at.toISOString(),
    }));
  });
}

export async function inviteMember(
  orgId: string,
  inviterUserId: string,
  body: { email: string; role: 'admin' | 'member' },
) {
  return withTransaction(async (client) => {
    const checkRes = await client.query(
      `SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2 AND role IN ('owner', 'admin') AND deleted_at IS NULL`,
      [orgId, inviterUserId],
    );
    if (checkRes.rowCount === 0) {
      throw new AppError({
        status: 403,
        code: 'FORBIDDEN_ADMIN_ACCESS',
        message: 'Only organization owners or admins can invite members.',
      });
    }

    // Find or create placeholder user atomically within transaction
    const userRes = await client.query(
      'SELECT id, email, name, avatar_url FROM users WHERE email = $1',
      [body.email],
    );
    let invitedUserId: string;

    if (userRes.rowCount && userRes.rowCount > 0) {
      invitedUserId = userRes.rows[0].id;
    } else {
      const newUserRes = await client.query(
        'INSERT INTO users (email, name, github_id) VALUES ($1, $2, $3) RETURNING id',
        [body.email, body.email.split('@')[0], `invited_${Date.now()}`],
      );
      invitedUserId = newUserRes.rows[0].id;
    }

    const memberId = `mem_${crypto.randomUUID().substring(0, 8)}`;
    const memberRes = await client.query(
      `INSERT INTO org_members (id, org_id, user_id, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role, deleted_at = NULL
       RETURNING id, created_at`,
      [memberId, orgId, invitedUserId, body.role],
    );

    const persistedRow = memberRes.rows[0];

    return {
      id: persistedRow.id,
      orgId,
      userId: invitedUserId,
      email: body.email,
      role: body.role,
      createdAt: persistedRow.created_at
        ? new Date(persistedRow.created_at).toISOString()
        : new Date().toISOString(),
    };
  });
}

export async function getOrganizationById(orgId: string): Promise<OrganizationDTO> {
  const res = await pool.query(
    `SELECT id, github_org_id, name, slug, avatar_url, deleted_at, created_at, updated_at
     FROM organizations WHERE id = $1`,
    [orgId],
  );

  if (res.rowCount === 0) {
    throw new AppError({
      status: 404,
      code: 'ORGANIZATION_NOT_FOUND',
      message: `Organization '${orgId}' not found.`,
    });
  }

  const r = res.rows[0];
  return {
    id: r.id,
    githubOrgId: r.github_org_id,
    name: r.name,
    slug: r.slug,
    avatarUrl: r.avatar_url,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
  };
}
