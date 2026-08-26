import { z } from 'zod';

export const launchSandboxBodySchema = z.object({
  mode: z.enum(['isolated', 'shared']).default('isolated'),
  autoSeed: z.boolean().default(true),
});

export const createGuestTicketBodySchema = z.object({
  expiresInSeconds: z.number().int().min(30).max(86400).default(300),
  maxUses: z.number().int().min(1).max(10).default(1),
});

export const guestExchangeBodySchema = z.object({
  ticket: z.string().min(1, 'ticket is required'),
});

export const sandboxPRParamsSchema = z.object({
  repoId: z.string().min(1),
  prId: z.string().min(1),
});

export const sandboxParamSchema = z.object({
  repoId: z.string().min(1),
  prId: z.string().min(1),
  sessionId: z.string().min(1),
});
