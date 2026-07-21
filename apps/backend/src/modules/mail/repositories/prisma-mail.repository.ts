import { Injectable } from '@nestjs/common';
import { IMailRepository } from '../interfaces/mail.interfaces';
import { IncomingEmail, EmailProcessingStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class PrismaMailRepository implements IMailRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async emailExists(messageId: string): Promise<boolean> {
    const count = await this.prisma.incomingEmail.count({
      where: { messageId },
    });
    return count > 0;
  }

  async saveEmail(data: any): Promise<IncomingEmail> {
    return this.prisma.incomingEmail.create({
      data: {
        ...data,
      },
    });
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.prisma.incomingEmail.update({
      where: { id },
      data: { status: status as EmailProcessingStatus },
    });
  }

  async logProcessing(
    emailId: string,
    status: string,
    message?: string,
    errorDetails?: any,
  ): Promise<void> {
    await this.prisma.emailProcessingLog.create({
      data: {
        emailId,
        status: status as EmailProcessingStatus,
        message,
        errorDetails: errorDetails || {},
      },
    });
  }

  async saveAttachment(emailId: string, attachment: any): Promise<void> {
    await this.prisma.emailAttachment.create({
      data: {
        emailId,
        ...attachment,
      },
    });
  }

  // New method for transactional save
  async saveEmailWithAttachmentsAndLogs(
    emailData: Partial<any>,
    attachmentsData: Partial<any>[],
    logData: any,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const email = await tx.incomingEmail.create({
        data: emailData as any,
      });

      if (attachmentsData && attachmentsData.length > 0) {
        attachmentsData.forEach((a) => (a.emailId = email.id));
        await tx.emailAttachment.createMany({ data: attachmentsData as any });
      }

      if (logData) {
        logData.emailId = email.id;
        await tx.emailProcessingLog.create({ data: logData });
      }

      return email;
    });
  }
}
