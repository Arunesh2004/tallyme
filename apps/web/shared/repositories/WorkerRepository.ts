import { WorkerHealth, WorkerLifecycleState } from '../workers/IWorker';

export interface WorkerRepository {
  updateWorkerHealth(workerName: string, health: WorkerHealth): Promise<void>;
  updateWorkerState(workerName: string, state: WorkerLifecycleState): Promise<void>;
  getWorkerHealth(workerName: string): Promise<WorkerHealth | null>;
}
