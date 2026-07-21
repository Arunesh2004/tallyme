import { IJob, IJobResult } from '../queues/IQueue';

export interface JobRepository {
  findById(jobId: string, queueName: string): Promise<IJob | null>;
  saveResult(jobId: string, result: IJobResult): Promise<void>;
  findFailedJobs(queueName: string, limit?: number): Promise<IJob[]>;
  moveJobToDLQ(jobId: string, queueName: string, reason: string): Promise<void>;
}
