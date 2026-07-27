import { JobsOptions } from 'bullmq';

export interface IQueueService {
  addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ): Promise<void>;

  getJobCounts(queueName: string): Promise<{
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
  }>;
}
