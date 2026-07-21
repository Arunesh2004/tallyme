import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { ERP_SYNC_QUEUE } from '../constants/erp.constants';
import { ProcessERPSyncUseCase } from '../use-cases/process-erp-sync.use-case';

@Processor(ERP_SYNC_QUEUE)
export class ERPSyncWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly useCase: ProcessERPSyncUseCase,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing ERP sync job ${job.id} for voucher ${job.data.voucherCandidateId}`,
      'ERPSyncWorker',
    );

    try {
      await this.useCase.execute(job.data.voucherCandidateId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `ERP Sync failed for voucher ${job.data.voucherCandidateId}`,
        (error as Error).stack,
        'ERPSyncWorker',
      );
      throw error; // Triggers BullMQ retry
    }
  }
}
