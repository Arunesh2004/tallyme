import { Worker, Job } from 'bullmq';
import { logger } from '../../../../shared/logging/logger';
import { VoucherSyncOrchestrator } from '../services/VoucherSyncOrchestrator';

export class VoucherSyncWorker {
  private worker: Worker;
  private orchestrator: VoucherSyncOrchestrator;

  constructor(redisConnection: any) {
    this.orchestrator = new VoucherSyncOrchestrator();
    
    // We configure exponential backoff on the worker for this queue
    this.worker = new Worker(
      'voucher-sync-queue',
      async (job: Job) => {
        logger.info(`Processing Voucher Sync Job: ${job.id}`);
        // The payload from VoucherCreated event
        const voucher = job.data.payload;
        const correlationId = job.data.correlationId || job.id; // Propagate correlationId
        const organizationId = job.data.organizationId;

        await this.orchestrator.syncVoucher(voucher.id, organizationId, correlationId);
      },
      { 
        connection: redisConnection,
        settings: {
          backoffStrategy: (attemptsMade: number, type: string, err: Error, job: Job) => {
            // Exponential backoff: 2s, 4s, 8s etc.
            return Math.pow(2, attemptsMade) * 1000;
          }
        }
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Voucher Sync Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Voucher Sync Job ${job?.id} failed (attempt ${job?.attemptsMade})`, { error: err.message });
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
