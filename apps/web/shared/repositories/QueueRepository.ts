import { QueueStatus, QueueMetrics } from '../queues/QueueHealthService';

export interface QueueRepository {
  getQueueStatus(queueName: string): Promise<QueueStatus>;
  getAllQueueStatuses(): Promise<QueueStatus[]>;
  updateQueueMetrics(queueName: string, metrics: Partial<QueueMetrics>): Promise<void>;
}
