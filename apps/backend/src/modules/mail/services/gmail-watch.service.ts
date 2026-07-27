import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IGmailClient } from '../interfaces/mail.interfaces';
import { MailProcessingService } from './mail-processing.service';
import { Inject } from '@nestjs/common';

import { GmailClientService } from './gmail-client.service';

@Injectable()
export class GmailWatchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GmailWatchService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private configService: ConfigService,
    private readonly mailClient: GmailClientService,
    private readonly mailProcessor: MailProcessingService,
  ) {}

  onApplicationBootstrap() {
    const imapConfig = this.configService.get('mail.imap');
    if (!imapConfig.user || !imapConfig.pass) {
      this.logger.warn('IMAP configuration missing. Mail polling aborted.');
      return;
    }
    this.setupWatch();
  }

  setupWatch(): void {
    const pollInterval = this.configService.get<number>('mail.pollIntervalMs') || 60000;
    this.logger.log(`Starting IMAP Mail Polling every ${pollInterval}ms`);
    
    this.timer = setInterval(() => {
      this.pollForEmails();
    }, pollInterval);
    
    // Initial fetch
    this.pollForEmails();
  }

  private async pollForEmails() {
    try {
      const unread = await this.mailClient.fetchUnreadEmails();
      if (unread.length > 0) {
        this.logger.log(`Found ${unread.length} unread emails.`);
      }
      
      for (const email of unread) {
        try {
          await this.mailProcessor.processRawEmail(email.raw); // Delegate raw parsing to downstream processor
          await this.mailClient.markAsRead(email.uid.toString());
        } catch (error: any) {
          this.logger.error(`Error processing email ${email.uid}: ${error.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Polling iteration failed: ${error.message}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    const imapConfig = this.configService.get('mail.imap');
    return !!(imapConfig?.user && imapConfig?.pass);
  }

  stopWatch(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
