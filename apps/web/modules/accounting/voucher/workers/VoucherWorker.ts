import { Worker, Job } from 'bullmq';
import { logger } from '../../../../shared/logging/logger';
import { VoucherOrchestrator } from '../services/VoucherOrchestrator';

export class VoucherWorker {
  private worker: Worker;
  private orchestrator: VoucherOrchestrator;

  constructor(redisConnection: any) {
    this.orchestrator = new VoucherOrchestrator();
    
    this.worker = new Worker(
      'voucher-generation-queue',
      async (job: Job) => {
        logger.info(`Processing Voucher Generation Job: ${job.id}`);
        const eventId = job.data.eventId;
        const payload = job.data.payload;
        const organizationId = job.data.organizationId;

        // payload is expected to be the full AccountingTransaction entity emitted by AccountingTransactionCreated
        await this.orchestrator.generateVoucher(job.data, organizationId);
      },
      { connection: redisConnection }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Voucher Generation Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Voucher Generation Job ${job?.id} failed`, { error: err.message });
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
