import { IncomingEmail, EmailAttachment } from '@prisma/client';

export interface IMailRepository {
  saveEmail(data: Partial<IncomingEmail>): Promise<IncomingEmail>;
  emailExists(messageId: string): Promise<boolean>;
  updateStatus(id: string, status: string): Promise<void>;
  logProcessing(
    emailId: string,
    status: string,
    message?: string,
    errorDetails?: any,
  ): Promise<void>;
  saveAttachment(
    emailId: string,
    attachment: Partial<EmailAttachment>,
  ): Promise<void>;
  saveEmailWithAttachmentsAndLogs(
    emailData: Partial<IncomingEmail>,
    attachmentsData: Partial<EmailAttachment>[],
    logData: any,
  ): Promise<IncomingEmail>;
}

export interface IParsedEmail {
  messageId: string;
  threadId?: string;
  sender: string;
  receiver: string;
  subject: string;
  timestamp: Date;
  plainText?: string;
  htmlText?: string;
  headers?: any;
  attachments?: {
    filename: string;
    contentType: string;
    sizeBytes: number;
    buffer: Buffer;
  }[];
}

export interface IGmailClient {
  fetchUnreadEmails(): Promise<any[]>;
  markAsRead(messageId: string): Promise<void>;
}
