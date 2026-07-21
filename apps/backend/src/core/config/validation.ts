import { z } from 'zod';

export const envValidationSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.enum(['true', 'false']).default('false').optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT Secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_CLOCK_TOLERANCE: z.coerce.number().int().nonnegative().default(30),
  JWT_ISSUER: z.string().default('tallyme'),
  JWT_AUDIENCE: z.string().default('tallyme-app'),
  SECURITY_BCRYPT_ROUNDS: z.coerce.number().int().min(10).default(12),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REDIRECT_URI: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  MAIL_STORAGE_PATH: z.string().default('./storage/attachments'),
  MAIL_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
});

export const validateEnv = (config: Record<string, unknown>) => {
  const parsed = envValidationSchema.safeParse(config);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
};
