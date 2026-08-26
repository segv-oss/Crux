import { z } from 'zod';

export const listTasksQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Number.parseInt(val, 10), 100) : 50)),
  cursor: z.string().optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const createTaskBodySchema = z.object({
  linearTaskId: z.string().min(1, 'linearTaskId is required'),
  title: z.string().min(1, 'title is required'),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']).default('p1'),
  assigneeId: z.string().optional().nullable(),
  linearUrl: z.string().url().optional(),
});

export const updateTaskBodySchema = z.object({
  done: z.boolean().optional(),
  title: z.string().optional(),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']).optional(),
  assigneeId: z.string().nullable().optional(),
  expectedVersion: z.number().int().positive('expectedVersion is required'),
});

export const taskParamSchema = z.object({
  repoId: z.string().min(1),
  prId: z.string().min(1),
  taskId: z.string().min(1),
});
