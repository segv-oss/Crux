import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { AppEnv } from '../types/hono.js';

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export function signToken(payload: JwtPayload, expiresIn: string = '15m'): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

export const authenticate = createMiddleware<AppEnv>(async (c, next) => {
  let token: string | undefined;

  const authHeader = c.req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = getCookie(c, 'auth_token');
  }

  if (!token) {
    throw new AppError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication token required.',
      type: 'https://crux.dev/errors/unauthorized',
      detail: 'Missing or invalid Authorization Bearer header or auth cookie.',
    });
  }

  try {
    const payload = verifyToken(token);
    c.set('user', payload);
    c.set('userId', payload.userId);
    await next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError({
        status: 401,
        code: 'TOKEN_EXPIRED',
        message: 'JWT token has expired. Please refresh your session.',
        type: 'https://crux.dev/errors/token-expired',
      });
    }

    throw new AppError({
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid JWT signature or malformed token payload.',
      type: 'https://crux.dev/errors/invalid-token',
    });
  }
});

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  let token: string | undefined;

  const authHeader = c.req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = getCookie(c, 'auth_token');
  }

  if (token) {
    try {
      const payload = verifyToken(token);
      c.set('user', payload);
      c.set('userId', payload.userId);
    } catch {
      // Gracefully ignore invalid token in optionalAuth
    }
  }

  await next();
});
