import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import {
  MatchStudentCommandHandler,
  MatchStudentCommand,
} from '../application';

@Processor('payment-candidate-processing')
export class StudentFeeWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly matchStudentCommandHandler: MatchStudentCommandHandler,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing student fee candidate job ${job.id} for candidateId ${job.data.candidateId}`,
      'StudentFeeWorker',
    );

    try {
      if (job.name === 'match-student') {
        const command = new MatchStudentCommand(
          job.data.candidateId,
          job.data.companyId,
        );
        // Pass null for tx since it's a top-level execution
        await this.matchStudentCommandHandler.execute(command, null as any);
        return { success: true };
      }
      this.logger.warn(`Unknown job name: ${job.name}`, 'StudentFeeWorker');
      return { success: false, reason: 'Unknown job name' };
    } catch (error: any) {
      this.logger.error(
        `Error processing student fee candidate ${job.data.candidateId}: ${(error as Error).message}`,
        (error as Error).stack,
        'StudentFeeWorker',
      );
      throw error;
    }
  }
}
