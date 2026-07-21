import { IWorker, WorkerHealth, WorkerLifecycleState, WorkerConfiguration, WorkerContext } from './IWorker';
import { WorkerError } from './WorkerError';
import { logger } from '../logging/logger';

export abstract class BaseWorker<T> implements IWorker {
  public readonly name: string;
  protected state: WorkerLifecycleState = 'INITIALIZED';
  protected activeJobs: number = 0;
  private startTime: number = 0;
  protected config: WorkerConfiguration;

  constructor(name: string, config: WorkerConfiguration = {}) {
    this.name = name;
    this.config = {
      concurrency: 1,
      ...config
    };
  }

  protected abstract processJob(data: T, context: WorkerContext): Promise<void>;

  public async start(): Promise<void> {
    if (this.state === 'RUNNING' || this.state === 'STARTING') return;
    this.state = 'STARTING';
    this.startTime = Date.now();
    // Implementation would attach to BullMQ/Kafka here
    this.state = 'RUNNING';
    logger.info({ worker: this.name }, 'Worker started successfully');
  }

  public async pause(): Promise<void> {
    this.state = 'PAUSING';
    // Implementation would pause consumption here
    this.state = 'PAUSED';
    logger.info({ worker: this.name }, 'Worker paused');
  }

  public async resume(): Promise<void> {
    if (this.state !== 'PAUSED') return;
    // Implementation would resume consumption here
    this.state = 'RUNNING';
    logger.info({ worker: this.name }, 'Worker resumed');
  }

  public async shutdown(): Promise<void> {
    this.state = 'SHUTTING_DOWN';
    logger.info({ worker: this.name }, 'Worker initiating graceful shutdown');
    // Implementation would wait for active jobs to finish or timeout
    this.state = 'SHUTDOWN';
    logger.info({ worker: this.name }, 'Worker shut down cleanly');
  }

  public getHealth(): WorkerHealth {
    return {
      name: this.name,
      state: this.state,
      activeJobs: this.activeJobs,
      uptimeSeconds: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
    };
  }

  // Wrapper for child classes to execute with telemetry
  protected async execute(data: T, context: WorkerContext): Promise<void> {
    this.activeJobs++;
    const startMs = Date.now();
    
    try {
      logger.debug({ worker: this.name, context }, 'Job started');
      await this.processJob(data, context);
      logger.info({ worker: this.name, context, durationMs: Date.now() - startMs }, 'Job completed successfully');
    } catch (error: any) {
      if (error instanceof WorkerError && error.isTransient) {
        logger.warn({ worker: this.name, context, error: error.message }, 'Job failed (Transient). Scheduled for retry.');
        throw error; // Rethrow to let the Queue adapter handle the retry policy
      } else {
        logger.error({ worker: this.name, context, error: error.message, stack: error.stack }, 'Job failed (Persistent). Moving to DLQ.');
        throw error; // Rethrow for DLQ processing
      }
    } finally {
      this.activeJobs--;
    }
  }
}
