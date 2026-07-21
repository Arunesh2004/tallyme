export interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
}

export interface QueueMetrics {
  totalJobsProcessed: number;
  errorRate: number;
  averageProcessingTime: number;
}

export interface QueueHealthService {
  getGlobalHealth(): Promise<{ healthy: boolean; queues: QueueStatus[] }>;
  getQueueMetrics(queueName: string): Promise<QueueMetrics>;
}
