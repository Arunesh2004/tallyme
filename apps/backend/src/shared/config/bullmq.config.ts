import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface BullMQConfig {
  queues: {
    ocr: string;
    aiExtraction: string;
    vendorMatch: string;
    expenseValidation: string;
    ledgerMapping: string;
    voucherBuilder: string;
    dlq: string;
  };
  retryAttempts: number;
  concurrency: number;
  backoff: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export const bullMQConfig = registerAs('bullmq', (): BullMQConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    queues: {
      ocr: env.BULLMQ_OCR_QUEUE,
      aiExtraction: env.BULLMQ_AI_QUEUE,
      vendorMatch: env.BULLMQ_VENDOR_MATCH_QUEUE,
      expenseValidation: env.BULLMQ_EXPENSE_VAL_QUEUE,
      ledgerMapping: env.BULLMQ_LEDGER_MAP_QUEUE,
      voucherBuilder: env.BULLMQ_VOUCHER_QUEUE,
      dlq: env.BULLMQ_DLQ,
    },
    retryAttempts: env.BULLMQ_RETRY_ATTEMPTS,
    concurrency: env.BULLMQ_CONCURRENCY,
    backoff: {
      type: env.BULLMQ_BACKOFF_TYPE,
      delay: env.BULLMQ_BACKOFF_DELAY,
    },
  };
});
