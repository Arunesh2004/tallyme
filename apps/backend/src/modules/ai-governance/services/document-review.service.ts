import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ReviewStatus, TransactionStatus, DuplicateRecommendedAction } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { TransactionDraftService } from '../../universal-transaction/services/transaction-draft.service';

@Injectable()
export class DocumentReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly draftService: TransactionDraftService,
  ) {}

  async getPendingQueue(tenantId: string) {
    return this.prisma.documentReviewQueue.findMany({
      where: {
        status: { in: [ReviewStatus.PENDING, ReviewStatus.ASSIGNED] },
        document: { companyId: tenantId }
      },
      include: { document: true }
    });
  }

  async assignReview(queueId: string, userId: string) {
    const item = await this.prisma.documentReviewQueue.findUnique({ where: { id: queueId } });
    if (!item || (item.status !== ReviewStatus.PENDING && item.status !== ReviewStatus.ASSIGNED)) {
      throw new BadRequestException('Invalid queue item for assignment');
    }

    return this.prisma.documentReviewQueue.update({
      where: { id: queueId },
      data: { status: ReviewStatus.ASSIGNED, assignedTo: userId }
    });
  }

  async approveReview(queueId: string, userId: string, updatedData: any) {
    const item = await this.prisma.documentReviewQueue.findUnique({ where: { id: queueId }, include: { document: true } });
    if (!item || item.status !== ReviewStatus.ASSIGNED) {
      throw new BadRequestException('Item must be ASSIGNED to be approved');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const q = await tx.documentReviewQueue.update({
        where: { id: queueId },
        data: {
          status: ReviewStatus.APPROVED,
          reviewedBy: userId,
          extractedData: updatedData,
        }
      });

      // Synthesis into TransactionDraft
      await this.draftService.createDraft(updatedData, userId);
      return q;
    });

    await this.audit.logEvent(userId, 'DOCUMENT_REVIEW_APPROVED', { queueId, documentId: item.documentId });
    return updated;
  }

  async rejectReview(queueId: string, userId: string, reason: string) {
    const item = await this.prisma.documentReviewQueue.findUnique({ where: { id: queueId }, include: { document: true } });
    if (!item) throw new NotFoundException('Queue item not found');

    const updated = await this.prisma.documentReviewQueue.update({
      where: { id: queueId },
      data: {
        status: ReviewStatus.REJECTED,
        reviewedBy: userId,
        reviewNotes: reason
      }
    });

    await this.audit.logEvent(userId, 'DOCUMENT_REVIEW_REJECTED', { queueId, documentId: item.documentId, reason });
    return updated;
  }
}
