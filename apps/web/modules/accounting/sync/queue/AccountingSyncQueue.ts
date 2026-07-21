import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../../../shared/config/env';

// We initialize IORedis properly
const connection = new IORedis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const ACCOUNTING_SYNC_QUEUE_NAME = 'accounting-sync';

// The DLQ queue name where failed jobs will be sent after retries
export const ACCOUNTING_SYNC_DLQ_NAME = 'accounting-sync-dlq';

export const accountingSyncQueue = new Queue(ACCOUNTING_SYNC_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs in redis for debugging
  },
});
