import { Worker, Job } from 'bullmq';
import { logger } from '../../../../shared/logging/logger';
import { AccountingMapperOrchestrator } from '../services/AccountingMapperOrchestrator';

export class AccountingMapperWorker {
  private worker: Worker;
  private orchestrator: AccountingMapperOrchestrator;

  constructor(redisConnection: any) {
    this.orchestrator = new AccountingMapperOrchestrator();
    
    this.worker = new Worker(
      'accounting-mapper-queue',
      async (job: Job) => {
        logger.info(`Processing Mapper Job: ${job.id}`);
        // Payload from Outbox (e.g. FeeAllocated event)
        const eventId = job.data.eventId;
        const eventType = job.data.eventType;
        const payload = job.data.payload;
        const organizationId = job.data.organizationId;

        await this.orchestrator.mapEvent(eventType, payload, eventId, organizationId);
      },
      { connection: redisConnection }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Mapper Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Mapper Job ${job?.id} failed`, { error: err.message });
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
