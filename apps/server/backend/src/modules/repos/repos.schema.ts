import { z } from 'zod';

export const listReposQuerySchema = z.object({
  limit: z.string().optional().transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 25)),
  cursor: z.string().optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
  search: z.string().optional(),
  includeDeleted: z.string().optional().transform((val) => val === 'true'),
});

export const connectRepoBodySchema = z.object({
  githubRepoId: z.number().int().positive('githubRepoId must be a positive integer'),
  fullName: z.string().min(1, 'fullName is required'),
  name: z.string().optional(),
  defaultBranch: z.string().default('main'),
  requiredApprovals: z.number().int().min(0).default(1),
  isPrivate: z.boolean().default(false),
});

export const repoParamsSchema = z.object({
  orgId: z.string().optional(),
  repoId: z.string().min(1, 'Repository ID is required'),
});

export const deleteRepoQuerySchema = z.object({
  hard: z.string().optional().transform((val) => val === 'true'),
});
