import { Hono } from 'hono';
import { authenticate } from '../../middleware/auth.js';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import * as orgsController from './orgs.controller.js';
import { createOrgBodySchema, inviteMemberBodySchema, orgParamsSchema } from './orgs.schema.js';

export const orgsRouter = new Hono<AppEnv>();

orgsRouter.use('*', authenticate);

orgsRouter.get('/', orgsController.listOrgs);
orgsRouter.post(
  '/',
  idempotencyGuard(),
  validate('json', createOrgBodySchema),
  orgsController.createOrg,
);
orgsRouter.get(
  '/:orgId/members',
  validate('param', orgParamsSchema),
  orgsController.listOrgMembers,
);
orgsRouter.post(
  '/:orgId/members',
  idempotencyGuard(),
  validate('param', orgParamsSchema),
  validate('json', inviteMemberBodySchema),
  orgsController.inviteOrgMember,
);
