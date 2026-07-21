import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { MAIL_PROCESSING_QUEUE } from '../constants/mail.constants';
import { Inject } from '@nestjs/common';
import { MAIL_REPOSITORY } from '../constants/mail.constants';
import { IMailRepository } from '../interfaces/mail.interfaces';

@Processor(MAIL_PROCESSING_QUEUE)
export class MailWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    @Inject(MAIL_REPOSITORY) private readonly repository: IMailRepository,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing email job ${job.id} for emailId ${job.data.emailId}`,
      'MailWorker',
    );

    await this.repository.updateStatus(job.data.emailId, 'PROCESSING');

    try {
      // Future: AI parsing, OCR, vendor matching
      // For now, it just succeeds.

      await this.repository.updateStatus(job.data.emailId, 'COMPLETED');
      await this.repository.logProcessing(
        job.data.emailId,
        'COMPLETED',
        'Email processed successfully',
      );

      return { success: true };
    } catch (error) {
      await this.repository.updateStatus(job.data.emailId, 'FAILED');
      await this.repository.logProcessing(
        job.data.emailId,
        'FAILED',
        (error as Error).message,
      );
      throw error;
    }
  }
}
