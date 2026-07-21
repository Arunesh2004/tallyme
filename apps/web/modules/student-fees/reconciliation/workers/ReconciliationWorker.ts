import { Worker, Job } from 'bullmq';
import { logger } from '../../../../shared/logging/logger';
import { ReconciliationOrchestrator } from '../services/ReconciliationOrchestrator';

export class ReconciliationWorker {
  private worker: Worker;
  private orchestrator: ReconciliationOrchestrator;

  constructor(redisConnection: any) {
    this.orchestrator = new ReconciliationOrchestrator();
    
    this.worker = new Worker(
      'reconciliation-queue',
      async (job: Job) => {
        logger.info(`Processing Reconciliation Job: ${job.id}`);
        // Payload from StudentMatched event
        const payload = job.data;
        await this.orchestrator.reconcile(payload);
      },
      { connection: redisConnection }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Reconciliation Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Reconciliation Job ${job?.id} failed`, { error: err.message });
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
