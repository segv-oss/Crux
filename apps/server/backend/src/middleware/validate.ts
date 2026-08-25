import { zValidator } from '@hono/zod-validator';
import { ZodSchema } from 'zod';
import { AppEnv } from '../types/hono.js';

export const validate = (target: 'json' | 'query' | 'param', schema: ZodSchema) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          type: 'https://crux.dev/errors/invalid-params',
          title: 'Invalid Parameters',
          status: 422,
          code: 'INVALID_PARAMS',
          detail: 'Request validation failed against schema constraints.',
          instance: c.req.path,
          timestamp: new Date().toISOString(),
          invalid_params: result.error.errors.map((e) => ({
            name: e.path.join('.'),
            reason: e.message,
            code: e.code,
          })),
        },
        422,
        { 'Content-Type': 'application/problem+json' }
      );
    }
  });
