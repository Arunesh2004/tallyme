import { WorkerHealth } from './IWorker';

export interface WorkerMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  retriedExecutions: number;
  averageExecutionTimeMs: number;
}

export interface WorkerHealthService {
  getGlobalHealth(): Promise<{ healthy: boolean; workers: WorkerHealth[] }>;
  getWorkerMetrics(workerName: string): Promise<WorkerMetrics>;
}
