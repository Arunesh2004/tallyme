import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { IMailRepository } from '../interfaces/mail.interfaces';
import {
  MAIL_REPOSITORY,
  MAIL_PROCESSING_QUEUE,
} from '../constants/mail.constants';
import { MailParserService } from './mail-parser.service';
import { MailStorageService } from './mail-storage.service';
import { DuplicateEmailException } from '../exceptions/mail.exceptions';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { EmailProcessingStatus } from '@prisma/client';

@Injectable()
export class MailProcessingService {
  constructor(
    @Inject(MAIL_REPOSITORY) private readonly repository: IMailRepository,
    private readonly parser: MailParserService,
    private readonly storage: MailStorageService,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly logger: LoggerService,
  ) {}

  async processRawEmail(rawEmail: any): Promise<void> {
    const parsed = await this.parser.parse(rawEmail);

    // Duplicate Detection
    const exists = await this.repository.emailExists(parsed.messageId);
    if (exists) {
      this.logger.warn(
        `Duplicate email ignored: ${parsed.messageId}`,
        'MailProcessingService',
      );
      throw new DuplicateEmailException(parsed.messageId);
    }

    // Prepare Data for Transaction
    const emailData = {
      messageId: parsed.messageId,
      threadId: parsed.threadId,
      sender: parsed.sender,
      receiver: parsed.receiver,
      subject: parsed.subject,
      timestamp: parsed.timestamp,
      plainText: parsed.plainText,
      htmlText: parsed.htmlText,
      headers: parsed.headers,
      status: EmailProcessingStatus.QUEUED,
    };

    const attachmentsData: any[] = [];
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        const path = await this.storage.storeAttachment(
          att.filename,
          att.buffer,
        );
        attachmentsData.push({
          filename: att.filename,
          contentType: att.contentType,
          sizeBytes: att.sizeBytes,
          storagePath: path,
        });
      }
    }

    const logData = {
      status: EmailProcessingStatus.QUEUED,
      message: 'Email added to processing queue',
      errorDetails: {},
    };

    // Store Email Metadata and Attachments Transactionally
    const emailRecord = await this.repository.saveEmailWithAttachmentsAndLogs(
      emailData,
      attachmentsData,
      logData
    );

    // Publish to Processing Queue
    await this.queue.addJob(MAIL_PROCESSING_QUEUE, 'process-email', {
      emailId: emailRecord.id,
    });

    this.logger.log(
      `Email stored successfully and queued: ${emailRecord.id}`,
      'MailProcessingService',
    );
  }
}
