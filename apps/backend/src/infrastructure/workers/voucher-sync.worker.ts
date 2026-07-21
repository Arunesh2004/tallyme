// src/infrastructure/workers/voucher-sync.worker.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ILogger } from '../../shared/observability';
import { ERPConnector } from '../erp/contracts';
import { ITransactionContext } from '../../shared/domain/repositories';
// Real imports for repositories would go here

@Injectable()
@Processor('erp-sync', { concurrency: 5 })
export class VoucherSyncWorker extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly logger: ILogger,
    private readonly erpConnector: ERPConnector,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const correlationId = job.data.correlationId;
    this.logger.info(`Starting Tally sync for Voucher ${job.data.voucherId}`, {
      correlationId,
    });

    try {
      // 1. Fetch VoucherCandidate from DB
      const candidate = { id: job.data.voucherId /* ... */ }; // Stub

      // 2. Call ERP Connector
      const response = await this.erpConnector.postVoucher({
        payload: candidate,
        correlationId,
      });

      // 3. Update Sync Status
      if (response.success) {
        this.logger.info(`Successfully synced Voucher ${job.data.voucherId}`);
        // await this.syncRepo.markSucceeded(job.data.voucherId, response.erpReferenceId);
        return { status: 'SUCCEEDED' };
      } else {
        throw new Error(`Tally Rejected: ${response.errorMessage}`); // Triggers BullMQ retry
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to sync voucher ${job.data.voucherId}`,
        error.stack,
      );
      // Fallback to DLQ or retry handled by BullMQ retry policy
      throw error;
    }
  }
}
