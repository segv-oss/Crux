import { z } from 'zod';

export const listPRsQuerySchema = z.object({
  status: z.enum(['all', 'open', 'draft', 'merged', 'closed']).default('open'),
  reviewDecision: z
    .enum(['all', 'pending', 'approved', 'changes_requested', 'not_required', 'draft'])
    .default('all'),
  search: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Number.parseInt(val, 10), 100) : 25)),
  cursor: z.string().optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
  includeDeleted: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const prParamsSchema = z.object({
  repoId: z.string().min(1, 'repoId is required'),
  prId: z.string().min(1, 'prId is required'),
});

export const getPRDetailsQuerySchema = z.object({
  includeDeleted: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const updatePRMetadataBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  targetBranch: z.string().optional(),
  expectedVersion: z.number().int().positive('expectedVersion is required'),
});

export const submitReviewBodySchema = z.object({
  action: z.enum(['approved', 'changes_requested', 'comment']),
  comment: z.string().optional(),
  expectedHeadSha: z.string().min(1, 'expectedHeadSha is required'),
  expectedReviewVersion: z.number().int().optional(),
});

export const dismissReviewBodySchema = z.object({
  dismissalReason: z.string().min(1, 'dismissalReason is required'),
});

export const reviewParamSchema = z.object({
  repoId: z.string().min(1),
  prId: z.string().min(1),
  reviewId: z.string().min(1),
});

export const mergePRBodySchema = z.object({
  expectedHeadSha: z.string().min(1, 'expectedHeadSha is required'),
  expectedVersion: z.number().int().positive('expectedVersion is required'),
  mergeMethod: z.enum(['squash', 'merge', 'rebase']).default('squash'),
  commitTitle: z.string().min(1, 'commitTitle is required'),
  commitMessage: z.string().optional(),
});

export const createCommentBodySchema = z.object({
  parentCommentId: z.string().nullable().optional(),
  filePath: z.string().min(1, 'filePath is required'),
  lineNumber: z.number().int().min(1, 'lineNumber must be >= 1'),
  side: z.enum(['LEFT', 'RIGHT']).default('RIGHT'),
  body: z.string().min(1, 'body cannot be empty'),
});

export const updateCommentBodySchema = z.object({
  body: z.string().min(1, 'body is required'),
  expectedVersion: z.number().int().positive('expectedVersion is required'),
});

export const deleteCommentBodySchema = z.object({
  expectedVersion: z.number().int().optional(),
});

export const commentParamSchema = z.object({
  repoId: z.string().min(1),
  prId: z.string().min(1),
  commentId: z.string().min(1),
});

export const listDiffQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Number.parseInt(val, 10), 200) : 50)),
  cursor: z.string().optional(),
});

export const getDiffQuerySchema = listDiffQuerySchema;

export const diffFileParamSchema = z.object({
  repoId: z.string().min(1),
  prId: z.string().min(1),
  fileIndex: z.string().transform((val) => Number.parseInt(val, 10)),
});

export const sendMessageBodySchema = z.object({
  text: z.string().min(1, 'text cannot be empty'),
});

export const createTaskBodySchema = z.object({
  title: z.string().min(1, 'title cannot be empty'),
  priority: z.enum(['p0', 'p1', 'p2']).default('p1'),
  linearTaskId: z.string().optional(),
});

export const updateTaskBodySchema = z.object({
  done: z.boolean().optional(),
  priority: z.enum(['p0', 'p1', 'p2']).optional(),
  title: z.string().optional(),
});

export const taskParamSchema = z.object({
  repoId: z.string().min(1),
  prId: z.string().min(1),
  taskId: z.string().min(1),
});
