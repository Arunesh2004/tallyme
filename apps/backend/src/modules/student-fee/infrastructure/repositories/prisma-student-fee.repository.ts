import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaStudentFeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createEmailDocument(data: any) {
    return this.prisma.emailDocument.create({ data });
  }

  async getEmailDocument(id: string) {
    return this.prisma.emailDocument.findUnique({ where: { id } });
  }

  async getEmailDocumentByMessageId(messageId: string) {
    return this.prisma.emailDocument.findUnique({ where: { messageId } });
  }

  async updateEmailDocumentStatus(
    id: string,
    status: any,
    lastProcessedStep?: string,
    confidenceScore?: number,
  ) {
    return this.prisma.emailDocument.update({
      where: { id },
      data: {
        status,
        ...(lastProcessedStep && { lastProcessedStep }),
        ...(confidenceScore && { confidenceScore }),
      },
    });
  }

  async createPaymentCandidate(data: any) {
    return this.prisma.studentPaymentCandidate.create({ data });
  }

  async findPaymentCandidatesByTxnOrUtr(
    gatewayTxnId: string | null,
    utr: string | null,
  ) {
    if (!gatewayTxnId && !utr) return [];

    return this.prisma.studentPaymentCandidate.findMany({
      where: {
        OR: [
          ...(gatewayTxnId ? [{ gatewayTransactionId: gatewayTxnId }] : []),
          ...(utr ? [{ utr: utr }] : []),
        ],
      },
    });
  }

  async createStudentMatch(data: any) {
    return this.prisma.studentMatchResult.create({ data });
  }

  async createFeeAllocation(data: any) {
    return this.prisma.studentFeeAllocation.create({
      data: {
        documentId: data.documentId,
        totalAllocated: data.totalAllocated,
        allocationType: data.allocationType,
        allocatedFees: {
          create: data.allocatedFees,
        },
      },
    });
  }

  async routeToManualReview(documentId: string, reason: string) {
    await this.prisma.emailDocument.update({
      where: { id: documentId },
      data: { status: 'MANUAL_REVIEW' },
    });

    return this.prisma.studentManualReviewRoute.create({
      data: {
        documentId,
        reason,
        status: 'PENDING',
      },
    });
  }

  async logAudit(documentId: string, action: string, metadata?: any) {
    return this.prisma.studentPaymentAudit.create({
      data: {
        documentId,
        action,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  }

  async findStudentById(id: string) {
    return this.prisma.student.findUnique({ where: { id } });
  }
}
