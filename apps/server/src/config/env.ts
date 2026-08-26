import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  PORT: z
    .string()
    .default('4000')
    .transform((val) => Number.parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/crux_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: isProd
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
    : z.string().min(16).default('crux_dev_jwt_secret_32_characters_minimum_len_secure!'),
  JWT_EXPIRES_IN: z
    .string()
    .default('86400')
    .transform((val) => Number.parseInt(val, 10)),
  PRIMARY_WEBHOOK_SECRET: isProd
    ? z.string().min(32, 'PRIMARY_WEBHOOK_SECRET must be at least 32 characters in production')
    : z.string().default('whsec_primary_dev_secret_key_123456789'),
  FALLBACK_WEBHOOK_SECRET: isProd
    ? z.string().min(32).optional()
    : z.string().default('whsec_fallback_dev_secret_key_987654321'),
  GITHUB_CLIENT_ID: isProd
    ? z.string().min(1, 'GITHUB_CLIENT_ID required in production')
    : z.string().default(''),
  GITHUB_CLIENT_SECRET: isProd
    ? z.string().min(1, 'GITHUB_CLIENT_SECRET required in production')
    : z.string().default(''),
  CORS_ORIGIN: isProd
    ? z
        .string()
        .refine(
          (val) => val !== '*' && val.trim().length > 0,
          'CORS_ORIGIN must be explicit and non-wildcard in production',
        )
    : z.string().default('*'),
  S3_BUCKET: z.string().default('crux-diff-storage'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  COOKIE_SECRET: isProd
    ? z.string().min(32, 'COOKIE_SECRET must be at least 32 characters in production')
    : z.string().default('crux_dev_cookie_secret_key_123456789_dev!'),
  APP_VERSION: z.string().default('1.0.0'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
