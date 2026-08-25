import { z } from 'zod';

export const PR_STATUS = ['open', 'draft', 'merged', 'closed'] as const;
export const REVIEW_DECISION = [
  'pending',
  'approved',
  'changes_requested',
  'not_required',
  'draft',
] as const;
export const REVIEW_ACTION = ['approved', 'changes_requested', 'comment'] as const;
export const TASK_PRIORITY = ['p0', 'p1', 'p2', 'p3'] as const;
export const DIRECTION = ['forward', 'backward'] as const;
export const MERGE_METHOD = ['merge', 'squash', 'rebase'] as const;

export const ERROR_CODES = [
  'SELF_REVIEW_PROHIBITED',
  'PR_HEAD_SHA_MISMATCH',
  'FORBIDDEN_TENANT_ACCESS',
  'ENTITY_NOT_DELETED',
  'TASK_NOT_FOUND_ON_PR',
  'MESSAGE_NOT_FOUND_ON_PR',
  'SANDBOX_TERMINATED',
] as const;

export const paginationQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  direction: z.enum(DIRECTION).optional(),
});

export const paginatedEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  });

export const connectRepoBody = z.object({
  githubRepoId: z.number().int(),
  fullName: z.string().min(1),
  requiredApprovals: z.number().int().min(0).default(1),
});

export const updatePrBody = z.object({
  title: z.string().min(1).optional(),
  expectedVersion: z.number().int().positive(),
});

export const submitReviewBody = z.object({
  action: z.enum(REVIEW_ACTION),
  comment: z.string().optional(),
  expectedHeadSha: z.string().length(40),
});

export const dismissReviewBody = z.object({
  dismissalReason: z.string().min(1),
});

export const mergePrBody = z.object({
  expectedHeadSha: z.string().length(40),
  expectedVersion: z.number().int().positive(),
  mergeMethod: z.enum(MERGE_METHOD),
  commitTitle: z.string().optional(),
  commitMessage: z.string().optional(),
});

export const createTaskBody = z.object({
  linearTaskId: z.string().min(1),
  title: z.string().min(1),
  priority: z.enum(TASK_PRIORITY),
  assigneeId: z.string().optional(),
});

export const updateTaskBody = z.object({
  done: z.boolean().optional(),
  assigneeId: z.string().nullable().optional(),
  expectedVersion: z.number().int().positive(),
});

export const postMessageBody = z.object({
  text: z.string().min(1),
});

export const updateMessageBody = z.object({
  text: z.string().min(1),
  expectedVersion: z.number().int().positive(),
});

export const launchSandboxBody = z.object({
  mode: z.enum(['isolated']).default('isolated'),
  autoSeed: z.boolean().default(true),
});

export const guestTicketBody = z.object({
  expiresInSeconds: z.number().int().positive(),
  maxUses: z.number().int().positive().default(1),
});

export const guestExchangeBody = z.object({
  ticket: z.string().min(1),
});

const nullableTimestamp = z.string().datetime().nullable();

export const User = z.object({
  id: z.string(),
  githubId: z.string(),
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string(),
  status: z.string().nullable().optional(),
  deletedAt: nullableTimestamp.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const Organization = z.object({
  id: z.string(),
  githubOrgId: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  avatarUrl: z.string().nullable(),
  deletedAt: nullableTimestamp.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const Repository = z.object({
  id: z.string(),
  orgId: z.string(),
  githubRepoId: z.number(),
  name: z.string(),
  fullName: z.string(),
  defaultBranch: z.string(),
  requiredApprovals: z.number(),
  isPrivate: z.boolean(),
  deletedAt: nullableTimestamp.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PullRequest = z.object({
  id: z.string(),
  repoId: z.string(),
  authorId: z.string(),
  number: z.number(),
  title: z.string(),
  headSha: z.string(),
  branch: z.string(),
  targetBranch: z.string(),
  status: z.enum(PR_STATUS),
  reviewDecision: z.enum(REVIEW_DECISION),
  checks: z.string(),
  version: z.number(),
  sequenceNumber: z.number(),
  additions: z.number(),
  deletions: z.number(),
  filesChanged: z.number(),
  description: z.string().nullable(),
  mergedAt: nullableTimestamp,
  mergedById: z.string().nullable(),
  mergeCommitSha: z.string().nullable(),
  deletedAt: nullableTimestamp.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PrReview = z.object({
  id: z.string(),
  prId: z.string(),
  reviewerId: z.string(),
  action: z.enum(REVIEW_ACTION),
  comment: z.string().nullable(),
  isDismissed: z.boolean(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PrComment = z.object({
  id: z.string(),
  prId: z.string(),
  parentCommentId: z.string().nullable(),
  userId: z.string(),
  filePath: z.string(),
  lineNumber: z.number(),
  side: z.string(),
  body: z.string(),
  version: z.number(),
  deletedAt: nullableTimestamp.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PrTask = z.object({
  id: z.string(),
  prId: z.string(),
  assigneeId: z.string().nullable(),
  linearTaskId: z.string(),
  title: z.string(),
  done: z.boolean(),
  priority: z.enum(TASK_PRIORITY),
  version: z.number(),
  linearUrl: z.string().nullable(),
  deletedAt: nullableTimestamp.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PrMessage = z.object({
  id: z.string(),
  prId: z.string(),
  userId: z.string(),
  slackMessageId: z.string().nullable(),
  text: z.string(),
  version: z.number(),
  deletedAt: nullableTimestamp.optional(),
  sentAt: z.string(),
  updatedAt: z.string(),
});

export const PrBrief = z.object({
  id: z.string(),
  prId: z.string(),
  risk: z.string(),
  reviewEstimateMinutes: z.number(),
  coverageDeltaPercent: z.number(),
  breakingChangesCount: z.number(),
  summary: z.string(),
  criticalPaths: z.array(z.unknown()),
  suggestedChecklist: z.array(z.unknown()),
  generatedAt: z.string(),
});

export const SandboxSession = z.object({
  id: z.string(),
  prId: z.string(),
  userId: z.string(),
  status: z.string(),
  progress: z.number().min(0).max(100),
  previewBaseUrl: z.string(),
  connectedUsers: z.number(),
  exitCode: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PrDiffFile = z.object({
  id: z.string(),
  prId: z.string(),
  fileIndex: z.number(),
  path: z.string(),
  oldPath: z.string().nullable(),
  status: z.string(),
  additions: z.number(),
  deletions: z.number(),
  isBinary: z.boolean(),
  createdAt: z.string(),
});

export const prJoinPayload = z.object({
  prId: z.string(),
  repoId: z.string(),
  lastSequenceNumber: z.number().optional(),
});

export const prSyncEvent = z.object({
  sequenceNumber: z.number(),
  type: z.string(),
  payload: z.record(z.unknown()),
});

export const prSyncEnvelope = z.object({
  type: z.enum(['incremental', 'full']),
  currentSequenceNumber: z.number(),
  events: z.array(prSyncEvent),
});

export const socketError = z.object({
  code: z.string(),
  message: z.string(),
});
