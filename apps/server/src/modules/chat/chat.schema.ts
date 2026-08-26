import { z } from 'zod';

export const listMessagesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Number.parseInt(val, 10), 100) : 50)),
  cursor: z.string().optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const postMessageBodySchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty'),
  slackMessageId: z.string().optional(),
});

export const updateMessageBodySchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty'),
  expectedVersion: z.number().int().positive('expectedVersion is required'),
});

export const messageParamSchema = z.object({
  repoId: z.string().min(1),
  prId: z.string().min(1),
  messageId: z.string().min(1),
});
