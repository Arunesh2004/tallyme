import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { MAIL_PROCESSING_QUEUE } from '../constants/mail.constants';
import { Inject } from '@nestjs/common';
import { MAIL_REPOSITORY } from '../constants/mail.constants';
import { IMailRepository } from '../interfaces/mail.interfaces';

import { MailProcessingService } from '../services/mail-processing.service';

@Processor(MAIL_PROCESSING_QUEUE)
export class MailWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    @Inject(MAIL_REPOSITORY) private readonly repository: IMailRepository,
    private readonly mailProcessingService: MailProcessingService,
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
      await this.mailProcessingService.processEmailJob(job.data.emailId);

      await this.repository.updateStatus(job.data.emailId, 'COMPLETED');
      await this.repository.logProcessing(
        job.data.emailId,
        'COMPLETED',
        'Email processed successfully',
      );

      return { success: true };
    } catch (error: any) {
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
