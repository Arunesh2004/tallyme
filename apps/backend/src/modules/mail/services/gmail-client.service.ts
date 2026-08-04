import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { IGmailClient } from '../interfaces/mail.interfaces';

@Injectable()
export class GmailClientService implements IGmailClient, OnModuleDestroy {
  private readonly logger = new Logger(GmailClientService.name);
  private client: ImapFlow;

  constructor(private configService: ConfigService) {
    const imapConfig = this.configService.get('mail.imap');

    this.client = new ImapFlow({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: true,
      auth: {
        user: imapConfig.user,
        pass: imapConfig.pass,
      },
      logger: false, // Turn off verbose imap logs for production
    });
  }

  private async ensureConnection(): Promise<void> {
    if (!this.client.usable) {
      await this.client.connect();
    }
  }

  async fetchUnreadEmails(): Promise<any[]> {
    const imapConfig = this.configService.get('mail.imap');
    if (!imapConfig.user || !imapConfig.pass) {
      this.logger.warn('IMAP Credentials missing. Skipping fetch.');
      return [];
    }

    try {
      await this.ensureConnection();
      const lock = await this.client.getMailboxLock('INBOX');
      const emails: any[] = [];
      try {
        const messages = this.client.fetch(
          { seen: false },
          { source: true, uid: true },
        );
        for await (const message of messages) {
          if (!message.source) continue;

          const parsed: import('mailparser').ParsedMail = await simpleParser(
            message.source as Buffer,
          );
          emails.push({
            uid: message.uid, // Internal IMAP ID
            messageId: parsed.messageId || `uid-${message.uid}`, // Email standard ID
            raw: message.source, // Keep raw source for downstream parsing
            parsed: parsed, // Basic parsed properties
          });
        }
      } finally {
        lock.release();
      }
      return emails;
    } catch (error: any) {
      this.logger.error(`IMAP Fetch Failed: ${error.message}`);
      throw error;
    }
  }

  async markAsRead(uid: string): Promise<void> {
    const imapConfig = this.configService.get('mail.imap');
    if (!imapConfig.user || !imapConfig.pass) {
      return;
    }

    try {
      await this.ensureConnection();
      const lock = await this.client.getMailboxLock('INBOX');
      try {
        // uid is passed from the fetcher
        await this.client.messageFlagsAdd({ uid: Number(uid) }, ['\\Seen'], {
          uid: true,
        });
        this.logger.debug(`Marked email UID ${uid} as read.`);
      } finally {
        lock.release();
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to mark email ${uid} as read: ${error.message}`,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client.usable) {
      await this.client.logout();
    }
  }
}
