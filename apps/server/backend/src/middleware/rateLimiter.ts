import { createMiddleware } from 'hono/factory';
import { redisClient } from '../config/redis.js';
import { AppError } from './errorHandler.js';
import { createLogger } from './logger.js';
import { AppEnv } from '../types/hono.js';
import { Context } from 'hono';

const logger = createLogger('rate-limiter');

const inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

export function createRateLimiter(options: {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
  identifierFn?: (c: Context<AppEnv>) => string;
}) {
  const { windowSeconds, maxRequests, keyPrefix, identifierFn } = options;

  return createMiddleware<AppEnv>(async (c, next) => {
    const id = identifierFn
      ? identifierFn(c)
      : c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
    const key = `ratelimit:${keyPrefix}:${id}`;
    const now = Date.now();

    let current = 1;

    try {
      // Atomic INCR + EXPIRE NX (only set TTL on key creation) via Redis Pipeline
      const pipeline = redisClient.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds, 'NX');
      const results = await pipeline.exec();
      if (results && results[0] && !results[0][0]) {
        current = results[0][1] as number;
      }
    } catch {
      // In-memory store fallback
      let entry = inMemoryStore.get(key);
      if (!entry || entry.expiresAt <= now) {
        entry = { count: 1, expiresAt: now + windowSeconds * 1000 };
        inMemoryStore.set(key, entry);
        current = 1;
      } else {
        entry.count += 1;
        current = entry.count;
      }
    }

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString());

    if (current > maxRequests) {
      c.header('Retry-After', windowSeconds.toString());
      c.header('X-RateLimit-Reset', Math.ceil((now + windowSeconds * 1000) / 1000).toString());
      throw new AppError({
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds}s. Please retry later.`,
        type: 'https://crux.dev/errors/rate-limit-exceeded',
      });
    }

    await next();
  });
}

// Preset Limiters
export const authRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 10,
  keyPrefix: 'auth',
});

export const sandboxLaunchLimiter = createRateLimiter({
  windowSeconds: 3600,
  maxRequests: 10,
  keyPrefix: 'sandbox-launch',
  identifierFn: (c) => c.get('userId') || c.req.header('x-forwarded-for') || 'anon',
});

export const webhookIngressLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 500,
  keyPrefix: 'webhook-ingress',
});
