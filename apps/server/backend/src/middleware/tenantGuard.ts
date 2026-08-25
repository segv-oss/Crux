import { createMiddleware } from 'hono/factory';
import { pool } from '../config/db.js';
import { AppError } from './errorHandler.js';
import { AppEnv } from '../types/hono.js';

/**
 * Middleware that strictly enforces active organization membership on any repository-scoped route.
 * Prevents BOLA / IDOR across tenant organizations.
 */
export const assertRepoTenantAccess = createMiddleware<AppEnv>(async (c, next) => {
  const repoId = c.req.param('repoId');
  const userId = c.get('userId') || c.get('user')?.userId;

  if (!userId) {
    throw new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required to access repository resources.',
    });
  }

  if (!repoId) {
    throw new AppError({
      status: 400,
      code: 'REPOSITORY_ID_REQUIRED',
      message: 'Repository ID is required for repository-scoped routes.',
    });
  }

  const resAuth = await pool.query(
    `SELECT r.id, r.org_id, om.role
     FROM repositories r
     JOIN org_members om ON om.org_id = r.org_id
     WHERE r.id = $1
       AND om.user_id = $2
       AND r.deleted_at IS NULL
       AND om.deleted_at IS NULL`,
    [repoId, userId]
  );

  if (resAuth.rowCount === 0) {
    throw new AppError({
      status: 403,
      code: 'FORBIDDEN_TENANT_ACCESS',
      message: `User does not have active membership in the organization owning repository '${repoId}'.`,
    });
  }

  // Attach verified tenant orgId and role to Hono context
  c.set('orgId', resAuth.rows[0].org_id);
  c.set('userRole', resAuth.rows[0].role);
  await next();
});

/**
 * Asserts that the authenticated user holds an 'admin' or 'owner' role in the repository's organization.
 */
export const assertRepoAdminRole = createMiddleware<AppEnv>(async (c, next) => {
  const role = c.get('userRole');
  if (role === 'admin' || role === 'owner') {
    await next();
    return;
  }

  const repoId = c.req.param('repoId');
  const userId = c.get('userId') || c.get('user')?.userId;

  if (!userId || !repoId) {
    throw new AppError({
      status: 403,
      code: 'FORBIDDEN_ADMIN_ACCESS',
      message: 'Administrative privileges required.',
    });
  }

  const resAuth = await pool.query(
    `SELECT om.role
     FROM repositories r
     JOIN org_members om ON om.org_id = r.org_id
     WHERE r.id = $1
       AND om.user_id = $2
       AND om.role IN ('admin', 'owner')
       AND r.deleted_at IS NULL
       AND om.deleted_at IS NULL`,
    [repoId, userId]
  );

  if (resAuth.rowCount === 0) {
    throw new AppError({
      status: 403,
      code: 'FORBIDDEN_ADMIN_ACCESS',
      message: 'Only repository organization admins or owners can perform this action.',
    });
  }

  c.set('userRole', resAuth.rows[0].role);
  await next();
});
