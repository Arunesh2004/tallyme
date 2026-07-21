import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { STUDENT_MATCHING_QUEUE } from '../constants/matching.constants';
import { ProcessMatchingUseCase } from '../use-cases/process-matching.use-case';

@Processor(STUDENT_MATCHING_QUEUE)
export class MatchingWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly useCase: ProcessMatchingUseCase,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing matching job ${job.id} for candidateId ${job.data.candidateId}`,
      'MatchingWorker',
    );

    try {
      await this.useCase.execute(job.data.candidateId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Matching failed for candidateId ${job.data.candidateId}`,
        (error as Error).stack,
        'MatchingWorker',
      );
      throw error;
    }
  }
}
