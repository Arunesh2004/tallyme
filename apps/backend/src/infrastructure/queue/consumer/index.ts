// consumer/index.ts
import { Injectable } from '@nestjs/common';
import { EventDispatcher } from '../../../shared/events';
import { ILogger, CorrelationContext } from '../../../shared/observability';

export interface WorkerSupervisor {
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
}

@Injectable()
export class EventWorker {
  constructor(
    private readonly dispatcher: EventDispatcher,
    private readonly logger: ILogger,
  ) {}

  async processJob(job: any): Promise<void> {
    const envelope = job.data;

    // Inject Correlation Context
    const contextData = {
      correlationId: envelope.metadata?.correlationId || crypto.randomUUID(),
      tenantId: envelope.metadata?.tenantId || 'DEFAULT',
      requestId: job.id,
    };

    await CorrelationContext.run(contextData, async () => {
      this.logger.info(
        `Processing job ${job.id} for event ${envelope.metadata?.eventType}`,
      );
      try {
        await this.dispatcher.dispatch(envelope);
      } catch (error: any) {
        this.logger.error(`Failed to process job ${job.id}`, error.stack);
        throw error; // BullMQ handles retries
      }
    });
  }
}

@Injectable()
export class WorkerRegistry {
  private workers: any[] = [];
  register(worker: any): void {
    this.workers.push(worker);
  }
  getAll(): any[] {
    return this.workers;
  }
}
