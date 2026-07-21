import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { FEE_VALIDATION_QUEUE } from '../constants/validation.constants';
import { ProcessValidationUseCase } from '../use-cases/process-validation.use-case';

@Processor(FEE_VALIDATION_QUEUE)
export class ValidationWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly useCase: ProcessValidationUseCase,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing validation job ${job.id} for candidate ${job.data.studentPaymentCandidateId}`,
      'ValidationWorker',
    );

    try {
      await this.useCase.execute(job.data.studentPaymentCandidateId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Validation failed for candidate ${job.data.studentPaymentCandidateId}`,
        (error as Error).stack,
        'ValidationWorker',
      );
      throw error;
    }
  }
}
