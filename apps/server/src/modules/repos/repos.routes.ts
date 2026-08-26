import { Hono } from 'hono';
import { authenticate } from '../../middleware/auth.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { assertRepoAdminRole, assertRepoTenantAccess } from '../../middleware/tenantGuard.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import { prsRouter } from '../prs/prs.routes.js';
import * as reposController from './repos.controller.js';
import {
  connectRepoBodySchema,
  deleteRepoQuerySchema,
  listReposQuerySchema,
  repoParamsSchema,
} from './repos.schema.js';

export const reposRouter = new Hono<AppEnv>();

reposRouter.use('*', authenticate);

reposRouter.get('/', validate('query', listReposQuerySchema), reposController.listRepos);
reposRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', connectRepoBodySchema),
  reposController.connectRepo,
);
reposRouter.delete(
  '/:repoId',
  idempotencyGuard(),
  validate('param', repoParamsSchema),
  validate('query', deleteRepoQuerySchema),
  assertRepoTenantAccess,
  assertRepoAdminRole,
  reposController.deleteRepo,
);
reposRouter.post(
  '/:repoId/restore',
  idempotencyGuard(),
  validate('param', repoParamsSchema),
  assertRepoTenantAccess,
  assertRepoAdminRole,
  reposController.restoreRepo,
);

// Mount nested /repos/:repoId/prs routes guarded by active tenant access
reposRouter.route('/:repoId/prs', prsRouter);
