import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { IParsedEmail } from '../interfaces/mail.interfaces';
import { EmailParsingException } from '../exceptions/mail.exceptions';

@Injectable()
export class MailParserService {
  constructor(private readonly logger: LoggerService) {}

  async parse(rawEmailContent: any): Promise<IParsedEmail> {
    try {
      this.logger.debug('Parsing raw email content', 'MailParserService');
      // Abstraction of parsing logic (e.g. mailparser library)
      return {
        messageId: rawEmailContent.messageId || `msg_${Date.now()}`,
        sender: rawEmailContent.from || 'unknown@sender.com',
        receiver: rawEmailContent.to || 'billing@tallyme.com',
        subject: rawEmailContent.subject || 'No Subject',
        timestamp: new Date(),
        plainText: rawEmailContent.text || '',
        htmlText: rawEmailContent.html || '',
        attachments: [],
      };
    } catch (error) {
      throw new EmailParsingException('Invalid email format', error as Error);
    }
  }
}
