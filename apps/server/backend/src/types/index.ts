export type ReviewAction = 'approved' | 'changes_requested' | 'comment' | 'dismissed';
export type PRStatus = 'open' | 'draft' | 'merged' | 'closed';
export type PRReviewDecision = 'pending' | 'approved' | 'changes_requested' | 'not_required' | 'draft';
export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3';
export type SandboxStatus = 'booting' | 'ready' | 'error' | 'terminated';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  githubUsername?: string;
}

export interface OrganizationDTO {
  id: string;
  githubOrgId?: string | null;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  role?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface RepositoryDTO {
  id: string;
  orgId: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  requiredApprovals: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PullRequestDTO {
  id: string;
  repoId: string;
  authorId: string;
  author?: UserSession | null;
  number: number;
  title: string;
  headSha: string;
  branch: string;
  targetBranch: string;
  status: PRStatus;
  reviewDecision: PRReviewDecision;
  checks: string;
  version: number;
  sequenceNumber: number;
  additions: number;
  deletions: number;
  filesChanged: number;
  description?: string | null;
  mergedAt?: string | null;
  mergedBy?: { id: string; name: string } | null;
  mergedById?: string | null;
  mergeCommitSha?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PRReviewDTO {
  id: string;
  prId: string;
  reviewerId: string;
  reviewer?: UserSession | null;
  action: ReviewAction;
  comment?: string | null;
  isDismissed: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PRCommentDTO {
  id: string;
  prId: string;
  parentCommentId?: string | null;
  userId: string;
  user?: UserSession | null;
  filePath: string;
  lineNumber: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
  version: number;
  isDeleted: boolean;
  replies?: PRCommentDTO[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PRTaskDTO {
  id: string;
  prId: string;
  assigneeId?: string | null;
  assignee?: UserSession | null;
  linearTaskId: string;
  title: string;
  done: boolean;
  priority: TaskPriority;
  version: number;
  linearUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PRMessageDTO {
  id: string;
  prId: string;
  userId: string;
  user?: UserSession | null;
  slackMessageId?: string | null;
  text: string;
  version: number;
  sentAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface PRBriefDTO {
  id: string;
  prId: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  reviewEstimateMinutes: number;
  coverageDeltaPercent: number;
  breakingChangesCount: number;
  summary: string;
  criticalPaths: Array<{ path: string; reason: string; riskLevel: string }>;
  suggestedChecklist: Array<{ text: string; done: boolean }>;
  generatedAt: string;
}

export interface SandboxSessionDTO {
  id: string;
  prId: string;
  userId: string;
  status: SandboxStatus;
  progress: number;
  previewBaseUrl: string;
  connectedUsers: number;
  exitCode?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageInfo {
  hasMore: boolean;
  hasPrevious?: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
  nextCursor?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  pageInfo: PageInfo;
  totalCount?: number;
}

export interface RFC7807Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  timestamp: string;
  invalid_params?: Array<{ name: string; reason: string; code: string }>;
  snapshotUrl?: string;
}
