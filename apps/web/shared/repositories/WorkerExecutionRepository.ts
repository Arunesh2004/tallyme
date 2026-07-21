import { WorkerMetrics } from '../workers/WorkerMetrics';

export interface WorkerExecutionRepository {
  recordExecution(workerName: string, durationMs: number, success: boolean): Promise<void>;
  recordFailure(workerName: string, errorReason: string, isTransient: boolean): Promise<void>;
  getMetrics(workerName: string): Promise<WorkerMetrics>;
}
