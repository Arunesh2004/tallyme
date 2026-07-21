import { JobsOptions } from 'bullmq';

export interface IQueueService {
  addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ): Promise<void>;
}
