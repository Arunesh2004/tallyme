import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaVendorAutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDocument(data: any) {
    return this.prisma.document.create({ data });
  }

  async getDocument(id: string) {
    return this.prisma.document.findUnique({ where: { id } });
  }

  async updateDocumentStatus(
    id: string,
    status: any,
    confidenceScore?: number,
  ) {
    return this.prisma.document.update({
      where: { id },
      data: { status, ...(confidenceScore && { confidenceScore }) },
    });
  }

  async createInvoiceCandidate(data: any) {
    return this.prisma.invoiceCandidate.create({ data });
  }

  async createVendorMatch(data: any) {
    return this.prisma.vendorMatch.create({ data });
  }

  async createExpenseAllocation(data: any) {
    return this.prisma.expenseAllocation.create({
      data: {
        documentId: data.documentId,
        totalAllocated: data.totalAllocated,
        lineItems: {
          create: data.lineItems,
        },
      },
    });
  }

  async routeToManualReview(documentId: string, reason: string) {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'MANUAL_REVIEW' },
    });

    return this.prisma.manualReviewRoute.create({
      data: {
        documentId,
        reason,
        status: 'PENDING',
      },
    });
  }

  async logAudit(documentId: string, action: string, metadata?: any) {
    return this.prisma.vendorSlipAudit.create({
      data: {
        documentId,
        action,
        metadata,
      },
    });
  }

  async findVendorByGstinOrPan(gstin: string, pan: string) {
    return this.prisma.vendor.findFirst({
      where: {
        OR: [
          { gstin: { equals: gstin, not: null } },
          { pan: { equals: pan, not: null } },
        ],
      },
    });
  }
}
