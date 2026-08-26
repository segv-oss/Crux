import { Context, Hono } from 'hono';
import { AppEnv } from '../types/hono.js';
import { createLogger } from './logger.js';

const logger = createLogger('error-handler');

export interface AppErrorOptions {
  status: number;
  code: string;
  message: string;
  type?: string;
  detail?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly type?: string;
  public readonly detail?: string;
  public readonly invalidParams?: Array<{ name: string; reason: string }>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.status = options.status;
    this.code = options.code;
    this.type = options.type;
    this.detail = options.detail || options.message;
    this.invalidParams = options.invalidParams;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function globalErrorHandler(err: Error, c: Context<AppEnv>) {
  logger.error({ err, path: c.req.path, method: c.req.method }, 'Unhandled request error');

  if (err instanceof AppError) {
    return c.json(
      {
        type: err.type || 'about:blank',
        title: err.code,
        status: err.status,
        code: err.code,
        detail: err.detail || err.message,
        instance: c.req.path,
        timestamp: new Date().toISOString(),
        ...(err.invalidParams ? { invalid_params: err.invalidParams } : {}),
      },
      err.status as any,
      { 'Content-Type': 'application/problem+json' }
    );
  }

  return c.json(
    {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      detail: 'An unexpected internal server error occurred.',
      instance: c.req.path,
      timestamp: new Date().toISOString(),
    },
    500,
    { 'Content-Type': 'application/problem+json' }
  );
}

export function notFoundHandler(c: Context<AppEnv>) {
  return c.json(
    {
      type: 'about:blank',
      title: 'Route Not Found',
      status: 404,
      code: 'NOT_FOUND',
      detail: `Cannot ${c.req.method} ${c.req.path}`,
      instance: c.req.path,
      timestamp: new Date().toISOString(),
    },
    404,
    { 'Content-Type': 'application/problem+json' }
  );
}

export function setupErrorHandlers(app: Hono<AppEnv>) {
  app.onError(globalErrorHandler);
  app.notFound(notFoundHandler);
}
