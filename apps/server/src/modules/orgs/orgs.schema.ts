import { z } from 'zod';

export const listOrgsQuerySchema = z.object({
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

export const orgParamSchema = z.object({
  orgId: z.string().min(1, 'Organization ID is required'),
});

export const orgParamsSchema = orgParamSchema;

export const createOrgBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  avatarUrl: z.string().url().optional(),
  githubOrgId: z.string().optional(),
});

export const inviteMemberBodySchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'member']).default('member'),
});
