import { z } from 'zod';

export const envSchema = z.object({
  // App
  APP_NAME: z.string().default('TallyMe Enterprise'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform(Number)
    .refine((n) => n > 0 && n <= 65535, { message: 'Invalid port' })
    .default('3000'),
  API_PREFIX: z.string().default('/api'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z
    .string()
    .transform(Number)
    .refine((n) => n > 0),
  REDIS_PASSWORD: z.string().optional(),

  // BullMQ
  BULLMQ_OCR_QUEUE: z.string().default('ocr-queue'),
  BULLMQ_AI_QUEUE: z.string().default('ai-extraction-queue'),
  BULLMQ_VENDOR_MATCH_QUEUE: z.string().default('vendor-match-queue'),
  BULLMQ_EXPENSE_VAL_QUEUE: z.string().default('expense-validation-queue'),
  BULLMQ_LEDGER_MAP_QUEUE: z.string().default('ledger-mapping-queue'),
  BULLMQ_VOUCHER_QUEUE: z.string().default('voucher-queue'),
  BULLMQ_DLQ: z.string().default('dead-letter-queue'),
  BULLMQ_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),
  BULLMQ_CONCURRENCY: z.string().transform(Number).default('10'),
  BULLMQ_BACKOFF_TYPE: z.enum(['fixed', 'exponential']).default('exponential'),
  BULLMQ_BACKOFF_DELAY: z.string().transform(Number).default('5000'),

  // Gmail
  GMAIL_CLIENT_ID: z.string().min(1),
  GMAIL_CLIENT_SECRET: z.string().min(1),
  GMAIL_REFRESH_TOKEN: z.string().min(1),
  GMAIL_ACCOUNT: z.string().email(),

  // AI
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  AI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default('gpt-4'),
  AI_TIMEOUT_MS: z
    .string()
    .transform(Number)
    .refine((n) => n > 0)
    .default('30000'),

  // ERP
  ERP_HOST: z.string().min(1),
  ERP_PORT: z
    .string()
    .transform(Number)
    .refine((n) => n > 0),
  ERP_USERNAME: z.string().optional(),
  ERP_PASSWORD: z.string().optional(),
  ERP_COMPANY_NAME: z.string().min(1),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_PRETTY_PRINT: z
    .string()
    .transform((s) => s === 'true')
    .default('false'),
  LOG_REQUEST_LOGGING: z
    .string()
    .transform((s) => s === 'true')
    .default('true'),

  // Security
  JWT_SECRET: z
    .string()
    .min(32, { message: 'JWT Secret must be at least 32 characters' }),
  JWT_EXPIRY: z.string().default('1h'),
  ENCRYPTION_KEY: z
    .string()
    .length(32, { message: 'Encryption key must be exactly 32 bytes' }),
  CORS_ORIGINS: z.string().default('*'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error(
      'Environment configuration validation failed. Startup aborted.',
    );
  }

  return parsed.data;
}
