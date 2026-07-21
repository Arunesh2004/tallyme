import { Worker, Job } from 'bullmq';
import { logger } from '../../../../shared/logging/logger';
import { MatchingOrchestrator } from '../services/MatchingOrchestrator';
import { ParsedPayment } from '../strategies/WeightedMatchingStrategy';

export class MatchingWorker {
  private worker: Worker;
  private orchestrator: MatchingOrchestrator;

  constructor(redisConnection: any) {
    this.orchestrator = new MatchingOrchestrator();
    
    this.worker = new Worker(
      'matching-queue',
      async (job: Job) => {
        logger.info(`Processing Matching Job: ${job.id}`);
        const payment: ParsedPayment = job.data.payment;
        await this.orchestrator.processPayment(payment);
      },
      { connection: redisConnection }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Matching Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Matching Job ${job?.id} failed`, { error: err.message });
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
