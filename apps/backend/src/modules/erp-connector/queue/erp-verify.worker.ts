import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { VerifyERPSyncUseCase } from '../use-cases/verify-erp-sync.use-case';

// Using a dedicated queue for verification as per architecture
@Processor('erp-verify-queue')
export class ERPVerifyWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly useCase: VerifyERPSyncUseCase,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      {
        message: 'Processing ERP verify job',
        jobId: job.data.jobId,
        attempt: job.attemptsMade,
      },
      'ERPVerifyWorker',
    );

    try {
      await this.useCase.execute(job.data.jobId, job.attemptsMade || 1);
      return { success: true };
    } catch (error) {
      this.logger.error(
        {
          message: 'ERP Verify job threw error, delegating to BullMQ retry',
          jobId: job.data.jobId,
        },
        (error as Error).stack,
        'ERPVerifyWorker',
      );
      throw error; // Triggers BullMQ retry
    }
  }
}
