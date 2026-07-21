import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { GmailClientService } from './gmail-client.service';
import { MailProcessingService } from './mail-processing.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailListenerService implements OnModuleInit {
  private pollInterval: number;

  constructor(
    private readonly logger: LoggerService,
    private readonly gmailClient: GmailClientService,
    private readonly processingService: MailProcessingService,
    private readonly configService: ConfigService,
  ) {
    this.pollInterval =
      this.configService.get<number>('mail.pollIntervalMs') || 60000;
  }

  onModuleInit() {
    this.logger.log(
      'MailListenerService initialized, starting poll interval',
      'MailListenerService',
    );
    // Abstraction of the polling loop
    // setInterval(() => this.pollInbox(), this.pollInterval);
  }

  async triggerSync(): Promise<number> {
    this.logger.log(
      'Manual inbox synchronization triggered',
      'MailListenerService',
    );
    return this.pollInbox();
  }

  private async pollInbox(): Promise<number> {
    try {
      const emails = await this.gmailClient.fetchUnreadEmails();
      for (const email of emails) {
        try {
          await this.processingService.processRawEmail(email);
          await this.gmailClient.markAsRead(email.messageId);
        } catch (error) {
          // Continue to next email if one fails
          this.logger.error(
            `Failed to process email from batch`,
            (error as Error).stack,
            'MailListenerService',
          );
        }
      }
      return emails.length;
    } catch (error) {
      this.logger.error(
        'Failed to poll inbox',
        (error as Error).stack,
        'MailListenerService',
      );
      return 0;
    }
  }
}
