import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TransactionDraftService } from '../../universal-transaction/services/transaction-draft.service';
import { AuditService } from '../../audit/audit.service';
import { ReviewStatus } from '@prisma/client';
import { CanonicalAccountingModel } from '../../universal-transaction/domain/types';
import { TransactionIntent } from '../../universal-transaction/domain/enums';
import { CompanyContextService } from '../../../core/context/company-context.service';

@Injectable()
export class DocumentReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly draftService: TransactionDraftService,
    private readonly auditService: AuditService,
    private readonly companyContext: CompanyContextService
  ) {}

  async createReviewEntry(documentId: string, confidenceScore: number, extractedData: any) {
    const review = await this.prisma.documentReviewQueue.upsert({
      where: { documentId },
      update: {
        confidenceScore,
        extractedData,
        status: ReviewStatus.PENDING,
      },
      create: {
        documentId,
        confidenceScore,
        extractedData,
        status: ReviewStatus.PENDING,
      }
    });

    await this.auditService.logEvent('system', 'DOCUMENT_REVIEW_CREATED', { documentId, reviewId: review.id });
    return review;
  }

  async assignReview(id: string, assignedTo: string, userId: string, organizationId: string) {
    const review = await this.prisma.documentReviewQueue.update({
      where: { id },
      data: {
        assignedTo,
        status: ReviewStatus.ASSIGNED
      }
    });
    await this.auditService.logEvent(userId, 'DOCUMENT_REVIEW_ASSIGNED', { reviewId: id, assignedTo, companyId: organizationId });
    return review;
  }

  async approveReview(id: string, reviewedBy: string, organizationId: string, notes?: string) {
    if (!organizationId) throw new BadRequestException('Organization ID is required');

    const review = await this.prisma.documentReviewQueue.findUnique({
      where: { id },
      include: { document: true }
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.status === ReviewStatus.APPROVED) throw new BadRequestException('Already approved');

    const extractedData = review.extractedData as any;
    
    const payload: CanonicalAccountingModel = {
      header: {
        companyId: organizationId,
        tenantId: organizationId,
        transactionIntent: TransactionIntent.PURCHASE,
        financialYear: '2026',
        exchangeRate: '1',
        status: 'DRAFT',
        invoiceNumber: extractedData.invoiceNumber || 'UNKNOWN',
        invoiceDate: extractedData.invoiceDate || new Date().toISOString(),
        currency: 'INR'
      },
      parties: {},
      ledgerEntries: [
         { ledgerId: 'dummy-vendor', amount: String(extractedData.amount || 0), isDebit: false },
         { ledgerId: 'dummy-expense', amount: String(extractedData.amount || 0), isDebit: true }
      ],
      metadata: { auditVersion: 1 }
    };

    const draft = await this.draftService.createDraft(payload, reviewedBy);

    const updated = await this.prisma.documentReviewQueue.update({
      where: { id },
      data: {
        status: ReviewStatus.APPROVED,
        reviewedBy,
        reviewNotes: notes
      }
    });

    await this.auditService.logEvent(reviewedBy, 'DOCUMENT_REVIEW_APPROVED', { reviewId: id, draftId: draft.id, companyId: organizationId });
    return updated;
  }

  async rejectReview(id: string, reviewedBy: string, organizationId: string, notes?: string) {
    if (!organizationId) throw new BadRequestException('Organization ID is required');

    const updated = await this.prisma.documentReviewQueue.update({
      where: { id },
      data: {
        status: ReviewStatus.REJECTED,
        reviewedBy,
        reviewNotes: notes
      }
    });

    await this.auditService.logEvent(reviewedBy, 'DOCUMENT_REVIEW_REJECTED', { reviewId: id, notes, companyId: organizationId });
    return updated;
  }
}
