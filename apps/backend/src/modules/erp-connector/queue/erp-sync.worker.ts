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
    let syncJobId = job.data.jobId;

    if (!syncJobId && job.data.voucherCandidateId) {
      const newJob = await this.useCase.createJob(job.data.voucherCandidateId);
      syncJobId = newJob.id;
      // Note: we can't await job.updateData in BullMQ inside process without specific setup,
      // but passing syncJobId to execute is enough for this execution
    }

    this.logger.log(
      {
        message: 'Processing ERP sync job',
        jobId: syncJobId,
        attempt: job.attemptsMade,
      },
      'ERPSyncWorker',
    );

    try {
      await this.useCase.execute(syncJobId, job.attemptsMade || 1);
      return { success: true };
    } catch (error: any) {
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
