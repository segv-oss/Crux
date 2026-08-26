import { Hono } from 'hono';
import { idempotencyGuard } from '../../middleware/idempotency.js';
import { assertRepoAdminRole, assertRepoTenantAccess } from '../../middleware/tenantGuard.js';
import { validate } from '../../middleware/validate.js';
import type { AppEnv } from '../../types/hono.js';
import { briefsRouter } from './briefs.routes.js';
import { chatRouter } from './chat.routes.js';
import { commentsRouter } from './comments.routes.js';
import * as prsController from './prs.controller.js';
import {
  diffFileParamSchema,
  dismissReviewBodySchema,
  getDiffQuerySchema,
  getPRDetailsQuerySchema,
  listPRsQuerySchema,
  mergePRBodySchema,
  prParamsSchema,
  reviewParamSchema,
  submitReviewBodySchema,
  updatePRMetadataBodySchema,
} from './prs.schema.js';
import { tasksRouter } from './tasks.routes.js';

export const prsRouter = new Hono<AppEnv>();

// Seal Multi-Tenant Boundary: All PR sub-routes require active membership in the repository's owning organization
prsRouter.use('*', assertRepoTenantAccess);

// 1. PR Listing & Details
prsRouter.get('/', validate('query', listPRsQuerySchema), prsController.listPRs);
prsRouter.get(
  '/:prId',
  validate('param', prParamsSchema),
  validate('query', getPRDetailsQuerySchema),
  prsController.getPR,
);
prsRouter.patch(
  '/:prId',
  idempotencyGuard(),
  validate('param', prParamsSchema),
  validate('json', updatePRMetadataBodySchema),
  prsController.updatePR,
);

// 2. Reviews & Dismissals
prsRouter.get('/:prId/reviews', validate('param', prParamsSchema), prsController.listReviews);
prsRouter.post(
  '/:prId/review',
  idempotencyGuard(),
  validate('param', prParamsSchema),
  validate('json', submitReviewBodySchema),
  prsController.submitReview,
);
prsRouter.post(
  '/:prId/reviews/:reviewId/dismiss',
  idempotencyGuard(),
  validate('param', reviewParamSchema),
  validate('json', dismissReviewBodySchema),
  assertRepoAdminRole,
  prsController.dismissReview,
);

// 3. Merging
prsRouter.post(
  '/:prId/merge',
  idempotencyGuard(),
  validate('param', prParamsSchema),
  validate('json', mergePRBodySchema),
  prsController.mergePR,
);

// 4. Diffs & AST Lines
prsRouter.get(
  '/:prId/diff',
  validate('param', prParamsSchema),
  validate('query', getDiffQuerySchema),
  prsController.getDiff,
);
prsRouter.get(
  '/:prId/diff/files/:fileIndex',
  validate('param', diffFileParamSchema),
  prsController.getDiffFile,
);
prsRouter.get('/:prId/diff/raw', validate('param', prParamsSchema), prsController.getRawDiff);

// 5. Nested Domain Sub-routers
prsRouter.route('/:prId/comments', commentsRouter);
prsRouter.route('/:prId/brief', briefsRouter);
prsRouter.route('/:prId/tasks', tasksRouter);
prsRouter.route('/:prId/messages', chatRouter);
