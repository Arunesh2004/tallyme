import { Injectable } from '@nestjs/common';
import { IGmailClient } from '../interfaces/mail.interfaces';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class GmailClientService implements IGmailClient {
  constructor(private readonly logger: LoggerService) {}

  async fetchUnreadEmails(): Promise<any[]> {
    this.logger.debug(
      'Fetching unread emails from Gmail (Mock)',
      'GmailClientService',
    );
    return []; // Return mock emails
  }

  async markAsRead(messageId: string): Promise<void> {
    this.logger.debug(
      `Marked email ${messageId} as read in Gmail`,
      'GmailClientService',
    );
  }
}
