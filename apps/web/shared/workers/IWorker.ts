export interface WorkerConfiguration {
  concurrency?: number;
  lockDuration?: number;
  maxStalledCount?: number;
}

export interface WorkerContext {
  jobId: string;
  traceId?: string;
  correlationId?: string;
  tenantId?: string;
}

export interface WorkerResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

export type WorkerLifecycleState = 'INITIALIZED' | 'STARTING' | 'RUNNING' | 'PAUSING' | 'PAUSED' | 'SHUTTING_DOWN' | 'SHUTDOWN' | 'FAILED';

export interface WorkerHealth {
  name: string;
  state: WorkerLifecycleState;
  activeJobs: number;
  uptimeSeconds: number;
}

export interface IWorker {
  name: string;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  shutdown(): Promise<void>;
  getHealth(): WorkerHealth;
}
