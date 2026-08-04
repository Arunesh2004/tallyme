import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';

@Injectable()
export class VmmsReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCandidateWithDocument(invoiceCandidateId: string) {
    return this.prisma.invoiceCandidate.findUnique({
      where: { id: invoiceCandidateId },
      include: { document: true },
    });
  }

  async saveApprovalDecision(
    invoiceCandidateId: string,
    documentId: string,
    vendorBranchId: string,
    vendorLedgerId: string,
    reviewerId: string,
    comment: string,
    matchEvidence: any,
  ) {
    await this.prisma.$transaction(async (tx: any) => {
      // 1. Upsert VendorMatchDecision
      await tx.vendorMatchDecision.upsert({
        where: { invoiceCandidateId },
        create: {
          invoiceCandidateId,
          selectedVendorLedgerId: vendorLedgerId,
          isAutomated: false,
          matchEvidence,
        },
        update: {
          selectedVendorLedgerId: vendorLedgerId,
          isAutomated: false,
          matchEvidence,
        },
      });

      // 2. Write VendorAudit
      await tx.vendorSlipAudit.create({
        data: {
          documentId,
          action: 'VMMS_MANUAL_REVIEW_APPROVED',
          metadata: {
            reviewerId,
            comment,
            vendorBranchId,
            vendorLedgerId,
          },
        },
      });

      // 3. Update status
      await tx.invoiceCandidate.update({
        where: { id: invoiceCandidateId },
        data: { status: 'QUEUED' },
      });
    });
  }
}
