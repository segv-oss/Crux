import { Hono } from 'hono';
import * as reposController from './repos.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { assertRepoTenantAccess, assertRepoAdminRole } from '../../middleware/tenantGuard.js';
import {
  listReposQuerySchema,
  connectRepoBodySchema,
  repoParamsSchema,
  deleteRepoQuerySchema,
} from './repos.schema.js';
import { prsRouter } from '../prs/prs.routes.js';
import { AppEnv } from '../../types/hono.js';

export const reposRouter = new Hono<AppEnv>();

reposRouter.use('*', authenticate);

reposRouter.get('/', validate('query', listReposQuerySchema), reposController.listRepos);
reposRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', connectRepoBodySchema),
  reposController.connectRepo
);
reposRouter.delete(
  '/:repoId',
  idempotencyGuard(),
  validate('param', repoParamsSchema),
  validate('query', deleteRepoQuerySchema),
  assertRepoTenantAccess,
  assertRepoAdminRole,
  reposController.deleteRepo
);
reposRouter.post(
  '/:repoId/restore',
  idempotencyGuard(),
  validate('param', repoParamsSchema),
  assertRepoTenantAccess,
  assertRepoAdminRole,
  reposController.restoreRepo
);

// Mount nested /repos/:repoId/prs routes guarded by active tenant access
reposRouter.route('/:repoId/prs', prsRouter);
