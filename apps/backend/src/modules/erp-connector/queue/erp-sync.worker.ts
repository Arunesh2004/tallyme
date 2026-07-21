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
      {
        message: 'Processing ERP sync job',
        jobId: job.data.jobId,
        attempt: job.attemptsMade,
      },
      'ERPSyncWorker',
    );

    try {
      await this.useCase.execute(job.data.jobId, job.attemptsMade || 1);
      return { success: true };
    } catch (error) {
      this.logger.error(
        {
          message: 'ERP Sync job threw error, delegating to BullMQ retry',
          jobId: job.data.jobId,
        },
        (error as Error).stack,
        'ERPSyncWorker',
      );
      throw error; // Triggers BullMQ retry
    }
  }
}
