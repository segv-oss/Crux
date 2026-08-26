import type {
  PrBrief,
  PrDiffFile,
  PrMessage,
  PrReview,
  PrTask,
  PullRequest,
  Repository,
  User,
} from '@crux/api-contract';
import type { z } from 'zod';

export type UserT = z.infer<typeof User>;
export type RepoT = z.infer<typeof Repository>;
export type PrT = z.infer<typeof PullRequest>;
export type ReviewT = z.infer<typeof PrReview>;
export type TaskT = z.infer<typeof PrTask>;
export type MessageT = z.infer<typeof PrMessage>;
export type BriefT = z.infer<typeof PrBrief>;
export type DiffFileT = z.infer<typeof PrDiffFile>;

export interface DiffLine {
  type: 'ctx' | 'add' | 'del' | 'meta';
  oldLn: number | null;
  newLn: number | null;
  content: string;
}

export interface DiffFileWithLines extends DiffFileT {
  lines: DiffLine[];
}

export type FeedEvent =
  | { id: string; kind: 'message'; at: string; message: MessageT }
  | { id: string; kind: 'task'; at: string; task: TaskT }
  | { id: string; kind: 'review'; at: string; review: ReviewT }
  | { id: string; kind: 'checks'; at: string; checks: string };

export const CURRENT_USER: UserT = {
  id: 'usr_dana_k',
  githubId: '1024',
  email: 'dana.k@segv.tech',
  name: 'dana.k',
  avatarUrl: '',
  createdAt: '2026-01-12T09:00:00Z',
  updatedAt: '2026-01-12T09:00:00Z',
};

export const REVIEWERS: UserT[] = [
  { ...CURRENT_USER, id: 'usr_arun', name: 'arun', email: 'arun@segv.tech' },
  { ...CURRENT_USER, id: 'usr_jm', name: 'jm', email: 'jm@segv.tech' },
];

export const repo: RepoT = {
  id: 'repo_segv_crux',
  orgId: 'org_segv',
  githubRepoId: 789456123,
  name: 'crux',
  fullName: 'segv-oss/crux',
  defaultBranch: 'main',
  requiredApprovals: 2,
  isPrivate: true,
  createdAt: '2026-01-10T09:00:00Z',
  updatedAt: '2026-01-10T09:00:00Z',
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const prs: PrT[] = [
  {
    id: 'pr_482',
    repoId: repo.id,
    authorId: 'usr_dana_k',
    number: 482,
    title: 'feat: rate-limit auth endpoints',
    headSha: 'a1b2c3d4e5f67890123456789abcdef012345678',
    branch: 'feat/rate-limit-auth',
    targetBranch: 'main',
    status: 'open',
    reviewDecision: 'pending',
    checks: 'pending',
    version: 3,
    sequenceNumber: 1043,
    additions: 142,
    deletions: 38,
    filesChanged: 6,
    description:
      'Introduces per-tier token buckets on the auth endpoints with a Redis fallback path. CRX-214.',
    mergedAt: null,
    mergedById: null,
    mergeCommitSha: null,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(0.3),
  },
  {
    id: 'pr_479',
    repoId: repo.id,
    authorId: 'usr_arun',
    number: 479,
    title: 'fix: debounce workspace switcher',
    headSha: 'b2c3d4e5f67890123456789abcdef01234567',
    branch: 'fix/switcher-debounce',
    targetBranch: 'main',
    status: 'open',
    reviewDecision: 'changes_requested',
    checks: 'passing',
    version: 7,
    sequenceNumber: 1040,
    additions: 24,
    deletions: 11,
    filesChanged: 2,
    description: 'Debounces the workspace switcher to stop double-fires on fast clicks.',
    mergedAt: null,
    mergedById: null,
    mergeCommitSha: null,
    createdAt: hoursAgo(26),
    updatedAt: hoursAgo(3),
  },
  {
    id: 'pr_471',
    repoId: repo.id,
    authorId: 'usr_jm',
    number: 471,
    title: 'chore: bump hono to 4.13',
    headSha: 'c3d4e5f67890123456789abcdef0123456789',
    branch: 'chore/hono-bump',
    targetBranch: 'main',
    status: 'open',
    reviewDecision: 'approved',
    checks: 'passing',
    version: 2,
    sequenceNumber: 1036,
    additions: 9,
    deletions: 9,
    filesChanged: 1,
    description: 'Routine framework bump.',
    mergedAt: null,
    mergedById: null,
    mergeCommitSha: null,
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(5),
  },
  {
    id: 'pr_468',
    repoId: repo.id,
    authorId: 'usr_dana_k',
    number: 468,
    title: 'feat: audit log export (CSV)',
    headSha: 'd4e5f67890123456789abcdef01234567890',
    branch: 'feat/audit-export',
    targetBranch: 'main',
    status: 'draft',
    reviewDecision: 'draft',
    checks: 'pending',
    version: 1,
    sequenceNumber: 1030,
    additions: 310,
    deletions: 4,
    filesChanged: 8,
    description: 'WIP export pipeline for the compliance dashboard.',
    mergedAt: null,
    mergedById: null,
    mergeCommitSha: null,
    createdAt: hoursAgo(50),
    updatedAt: hoursAgo(22),
  },
  {
    id: 'pr_455',
    repoId: repo.id,
    authorId: 'usr_arun',
    number: 455,
    title: 'fix: ghost-user reassignment on purge',
    headSha: 'e5f67890123456789abcdef012345678901',
    branch: 'fix/ghost-purge',
    targetBranch: 'main',
    status: 'merged',
    reviewDecision: 'approved',
    checks: 'passing',
    version: 4,
    sequenceNumber: 1024,
    additions: 88,
    deletions: 12,
    filesChanged: 3,
    description: 'GDPR purge now reassigns history before deleting profiles.',
    mergedAt: hoursAgo(70),
    mergedById: 'usr_jm',
    mergeCommitSha: 'f67890123456789abcdef0123456789012',
    createdAt: hoursAgo(96),
    updatedAt: hoursAgo(70),
  },
  {
    id: 'pr_450',
    repoId: repo.id,
    authorId: 'usr_jm',
    number: 450,
    title: 'feat: Linear two-way status sync',
    headSha: '67890123456789abcdef01234567890123',
    branch: 'feat/linear-sync',
    targetBranch: 'main',
    status: 'closed',
    reviewDecision: 'pending',
    checks: 'failing',
    version: 9,
    sequenceNumber: 1018,
    additions: 210,
    deletions: 44,
    filesChanged: 11,
    description: 'Closed in favor of the webhooks-first approach.',
    mergedAt: null,
    mergedById: null,
    mergeCommitSha: null,
    createdAt: hoursAgo(120),
    updatedAt: hoursAgo(88),
  },
];

export const activePr = prs[0];

export const reviews: ReviewT[] = [
  {
    id: 'rev_1',
    prId: activePr.id,
    reviewerId: 'usr_jm',
    action: 'comment',
    comment: 'Left notes on the bucket refill math — non-blocking.',
    isDismissed: false,
    version: 1,
    createdAt: hoursAgo(1.2),
    updatedAt: hoursAgo(1.2),
  },
  {
    id: 'rev_2',
    prId: activePr.id,
    reviewerId: 'usr_arun',
    action: 'changes_requested',
    comment: 'Can we fall back to defaults if Redis is down?',
    isDismissed: false,
    version: 1,
    createdAt: hoursAgo(0.5),
    updatedAt: hoursAgo(0.5),
  },
];

export const tasks: TaskT[] = [
  {
    id: 'task_1',
    prId: activePr.id,
    assigneeId: 'usr_dana_k',
    linearTaskId: 'CRX-214',
    title: 'Rate-limit auth endpoints',
    done: false,
    priority: 'p0',
    version: 2,
    linearUrl: 'https://linear.app/segv/issue/CRX-214',
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'task_2',
    prId: activePr.id,
    assigneeId: 'usr_arun',
    linearTaskId: 'CRX-219',
    title: 'Add backoff to refresh flow',
    done: false,
    priority: 'p1',
    version: 1,
    linearUrl: 'https://linear.app/segv/issue/CRX-219',
    createdAt: hoursAgo(28),
    updatedAt: hoursAgo(26),
  },
  {
    id: 'task_3',
    prId: activePr.id,
    assigneeId: null,
    linearTaskId: 'CRX-231',
    title: 'Load-test staging with burst traffic',
    done: false,
    priority: 'p2',
    version: 1,
    linearUrl: 'https://linear.app/segv/issue/CRX-231',
    createdAt: hoursAgo(20),
    updatedAt: hoursAgo(20),
  },
];

export const messages: MessageT[] = [
  {
    id: 'msg_1',
    prId: activePr.id,
    userId: 'usr_arun',
    slackMessageId: 'S1',
    text: 'taking the review after standup — the diff on limiter.ts looks clean so far',
    version: 1,
    sentAt: hoursAgo(1.4),
    updatedAt: hoursAgo(1.4),
  },
  {
    id: 'msg_2',
    prId: activePr.id,
    userId: 'usr_jm',
    slackMessageId: 'S2',
    text: 'refill math: buckets refill lazily on read, right? that is fine for p0 but flag it for the load test',
    version: 1,
    sentAt: hoursAgo(1.1),
    updatedAt: hoursAgo(1.1),
  },
  {
    id: 'msg_3',
    prId: activePr.id,
    userId: 'usr_dana_k',
    slackMessageId: 'S3',
    text: 'yep lazy refill. CRX-231 covers the burst load test before merge',
    version: 1,
    sentAt: hoursAgo(0.9),
    updatedAt: hoursAgo(0.9),
  },
  {
    id: 'msg_4',
    prId: activePr.id,
    userId: 'usr_arun',
    slackMessageId: 'S4',
    text: 'requested changes on the redis fallback — everything else LGTM',
    version: 1,
    sentAt: hoursAgo(0.5),
    updatedAt: hoursAgo(0.5),
  },
];

export const brief: BriefT = {
  id: 'brief_482',
  prId: activePr.id,
  risk: 'high',
  reviewEstimateMinutes: 14,
  coverageDeltaPercent: -2.5,
  breakingChangesCount: 0,
  summary:
    'Auth path change on a hot route. Redis dependency adds a new failure mode — fallback behavior needs a test. No schema or API contract changes.',
  criticalPaths: [
    'POST /v1/auth/token — now rate-limited per IP+tier',
    'Redis unavailable → requests fall through to static defaults',
  ],
  suggestedChecklist: [
    'Verify fallback path when Redis is down',
    'Confirm bucket refill math under burst',
    'Check rate-limit headers surface to clients',
  ],
  generatedAt: hoursAgo(0.4),
};

const limiterLines: DiffLine[] = [
  {
    type: 'meta',
    oldLn: null,
    newLn: null,
    content: '@@ -12,6 +12,14 @@ export class AuthLimiter {',
  },
  { type: 'ctx', oldLn: 12, newLn: 12, content: "import { Redis } from 'ioredis';" },
  { type: 'del', oldLn: 13, newLn: null, content: 'const MAX_ATTEMPTS = 5;' },
  { type: 'del', oldLn: 14, newLn: null, content: 'const WINDOW_MS = 60_000;' },
  {
    type: 'add',
    oldLn: null,
    newLn: 13,
    content: "import { TokenBucket, TierConfig } from './bucket';",
  },
  { type: 'add', oldLn: null, newLn: 14, content: '' },
  { type: 'add', oldLn: null, newLn: 15, content: 'const TIERS: Record<string, TierConfig> = {' },
  { type: 'add', oldLn: null, newLn: 16, content: '  free: { capacity: 10, refillPerSec: 0.5 },' },
  { type: 'add', oldLn: null, newLn: 17, content: '  pro: { capacity: 100, refillPerSec: 5 },' },
  {
    type: 'add',
    oldLn: null,
    newLn: 18,
    content: '  enterprise: { capacity: 1000, refillPerSec: 50 },',
  },
  { type: 'add', oldLn: null, newLn: 19, content: '};' },
  { type: 'ctx', oldLn: 15, newLn: 20, content: '' },
  { type: 'ctx', oldLn: 16, newLn: 21, content: 'export class AuthLimiter {' },
  { type: 'del', oldLn: 17, newLn: null, content: '  private hits = new Map<string, number>();' },
  {
    type: 'add',
    oldLn: null,
    newLn: 22,
    content: '  private buckets = new Map<string, TokenBucket>();',
  },
  { type: 'ctx', oldLn: 18, newLn: 23, content: '' },
  { type: 'del', oldLn: 19, newLn: null, content: '  async check(ip: string): Promise<boolean> {' },
  {
    type: 'add',
    oldLn: null,
    newLn: 24,
    content: "  async check(ip: string, tier = 'free'): Promise<boolean> {",
  },
  { type: 'add', oldLn: null, newLn: 25, content: '    const cfg = TIERS[tier] ?? TIERS.free;' },
  { type: 'add', oldLn: null, newLn: 26, content: '    const bucket = this.get(ip, cfg);' },
  { type: 'add', oldLn: null, newLn: 27, content: '    return bucket.take();' },
  { type: 'ctx', oldLn: 20, newLn: 28, content: '  }' },
];

const migrationLines: DiffLine[] = [
  { type: 'meta', oldLn: null, newLn: null, content: '@@ -0,0 +1,9 @@' },
  { type: 'add', oldLn: null, newLn: 1, content: '-- 0007: per-tier rate limit buckets' },
  {
    type: 'add',
    oldLn: null,
    newLn: 2,
    content: 'CREATE TABLE IF NOT EXISTS rate_limit_overrides (',
  },
  { type: 'add', oldLn: null, newLn: 3, content: '  org_id VARCHAR(64) PRIMARY KEY,' },
  { type: 'add', oldLn: null, newLn: 4, content: "  tier VARCHAR(20) NOT NULL DEFAULT 'pro'," },
  { type: 'add', oldLn: null, newLn: 5, content: '  capacity INT NOT NULL,' },
  { type: 'add', oldLn: null, newLn: 6, content: '  refill_per_sec NUMERIC(8,2) NOT NULL,' },
  { type: 'add', oldLn: null, newLn: 7, content: '  updated_at TIMESTAMPTZ DEFAULT now()' },
  { type: 'add', oldLn: null, newLn: 8, content: ');' },
  {
    type: 'add',
    oldLn: null,
    newLn: 9,
    content: 'CREATE INDEX idx_rlo_tier ON rate_limit_overrides(tier);',
  },
];

export const diffFiles: DiffFileWithLines[] = [
  {
    id: 'diff_1',
    prId: activePr.id,
    fileIndex: 0,
    path: 'src/auth/limiter.ts',
    oldPath: null,
    status: 'modified',
    additions: 14,
    deletions: 6,
    isBinary: false,
    createdAt: hoursAgo(2),
    lines: limiterLines,
  },
  {
    id: 'diff_2',
    prId: activePr.id,
    fileIndex: 1,
    path: 'db/migrations/0007_rate_limit_overrides.sql',
    oldPath: null,
    status: 'added',
    additions: 9,
    deletions: 0,
    isBinary: false,
    createdAt: hoursAgo(2),
    lines: migrationLines,
  },
];

export interface InlineComment {
  id: string;
  prId: string;
  filePath: string;
  lineNumber: number;
  userId: string;
  body: string;
  createdAt: string;
}

export const inlineComments: InlineComment[] = [
  {
    id: 'cmt_1',
    prId: activePr.id,
    filePath: 'src/auth/limiter.ts',
    lineNumber: 26,
    userId: 'usr_arun',
    body: 'What happens here when Redis is down? Needs a hard fallback to static defaults — this is the auth path.',
    createdAt: hoursAgo(0.5),
  },
];

export const DEFAULT_USERS: UserT[] = [
  CURRENT_USER,
  { ...CURRENT_USER, id: 'usr_sarah', name: 'sarah.chen', email: 'sarah.chen@crux.dev' },
  { ...CURRENT_USER, id: 'usr_alex', name: 'alex.rivera', email: 'alex.rivera@crux.dev' },
  { ...CURRENT_USER, id: 'usr_marcus', name: 'marcus.vance', email: 'marcus.vance@crux.dev' },
  { ...CURRENT_USER, id: 'usr_arun', name: 'arun', email: 'arun@segv.tech' },
  { ...CURRENT_USER, id: 'usr_jm', name: 'jm', email: 'jm@segv.tech' },
];

export function userById(id: string): UserT {
  if (!id) return CURRENT_USER;
  if (id === CURRENT_USER.id) return CURRENT_USER;
  const found = DEFAULT_USERS.find((u) => u.id === id);
  if (found) return found;
  return {
    ...CURRENT_USER,
    id,
    name: id.replace('usr_', '').replace('_', ' '),
  };
}
