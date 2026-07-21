export interface RetryPolicy {
  attempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number; // in ms
  };
}

export interface QueueOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  timeout?: number; // max execution time
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface IJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts?: QueueOptions;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
}

export interface IJobResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface IQueue<T = any> {
  name: string;
  add(name: string, data: T, opts?: QueueOptions): Promise<IJob<T>>;
  addBulk(jobs: { name: string; data: T; opts?: QueueOptions }[]): Promise<IJob<T>[]>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export interface IJobHandler<T = any, R = any> {
  process(job: IJob<T>): Promise<IJobResult<R>>;
}
