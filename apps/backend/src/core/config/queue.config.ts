import { registerAs } from '@nestjs/config';

export const queueConfig = registerAs('queue', () => ({
  defaultJobOptions: {
    attempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS || '3', 10),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '1000', 10),
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
}));
