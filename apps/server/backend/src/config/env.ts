import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/crux_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16).default('crux_dev_jwt_secret_32_characters_minimum_len_secure!'),
  JWT_EXPIRES_IN: z.string().default('86400').transform((val) => parseInt(val, 10)),
  PRIMARY_WEBHOOK_SECRET: z.string().default('whsec_primary_dev_secret_key_123456789'),
  FALLBACK_WEBHOOK_SECRET: z.string().default('whsec_fallback_dev_secret_key_987654321'),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  CORS_ORIGIN: z.string().default('*'),
  S3_BUCKET: z.string().default('crux-diff-storage'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  COOKIE_SECRET: z.string().default('crux_cookie_secret_secure_key_123456789'),
  APP_VERSION: z.string().default('1.0.0'),
}).refine((data) => {
  if (data.NODE_ENV === 'production') {
    if (data.JWT_SECRET.includes('dev') || data.COOKIE_SECRET.includes('dev')) {
      return false;
    }
    if (data.CORS_ORIGIN === '*' || !data.CORS_ORIGIN) {
      return false;
    }
    if (!data.GITHUB_CLIENT_ID || !data.GITHUB_CLIENT_SECRET) {
      return false;
    }
  }
  return true;
}, {
  message: 'In production mode, real GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, explicit CORS_ORIGIN, and secure secrets are strictly required.',
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
