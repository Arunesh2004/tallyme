// src/modules/student-fee/api/student-review.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../auth/guards/permissions.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CompanyContextService } from '../../../core/context/company-context.service';
import { TransactionDraftService } from '../../universal-transaction/services/transaction-draft.service';
import { StudentFeeDraftAdapter } from '../application/student-fee-draft.adapter';

@Controller('student-fees/manual-review')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StudentManualReviewController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyContext: CompanyContextService,
    private readonly draftService: TransactionDraftService,
    private readonly draftAdapter: StudentFeeDraftAdapter,
  ) {}

  @Get()
  @RequirePermissions('StudentFee.Read')
  async listReviews() {
    const reviews = await this.prisma.studentManualReviewRoute.findMany({
      where: { status: 'PENDING' },
      include: {
        document: {
          include: {
            paymentCandidate: true,
          },
        },
      },
    });
    return { data: reviews };
  }

  @Get(':id')
  @RequirePermissions('StudentFee.Read')
  async getReview(@Param('id') id: string) {
    const review = await this.prisma.studentManualReviewRoute.findUnique({
      where: { id },
      include: {
        document: {
          include: {
            paymentCandidate: true,
            studentMatch: true,
          },
        },
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('StudentFee.Resolve')
  async approveReview(@Param('id') id: string) {
    const review = await this.prisma.studentManualReviewRoute.findUnique({
      where: { id },
      include: { document: { include: { paymentCandidate: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status !== 'PENDING')
      throw new BadRequestException('Review already resolved');

    await this.prisma.$transaction(async (tx) => {
      await tx.studentManualReviewRoute.update({
        where: { id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      if (review.document.paymentCandidate) {
        await tx.studentPaymentCandidate.update({
          where: { id: review.document.paymentCandidate.id },
          data: { status: 'APPROVED', manualReviewRequired: false },
        });
      }
      await tx.emailDocument.update({
        where: { id: review.documentId },
        data: { status: 'VOUCHER_GENERATED' }, // Advanced state for builder
      });
      await tx.studentPaymentAudit.create({
        data: {
          documentId: review.documentId,
          action: 'MANUAL_REVIEW_APPROVED',
          metadata: { routeId: id },
        },
      });
    });

    if (review.document.paymentCandidate) {
      const companyId = this.companyContext.getCompanyId();
      const legacyPayload = {
        voucherType: 'RECEIPT',
        companyId,
        allocationData: {
          allocatedAmount: Number(review.document.paymentCandidate.amount) || 0,
          allocationBreakdown: [
            {
              feeHeadName: 'Fee Collection',
              allocated: Number(review.document.paymentCandidate.amount) || 0,
            },
          ],
        },
        paymentData: {
          gateway: review.document.paymentCandidate.paymentGateway || '',
          reference: review.document.paymentCandidate.paymentCandidateId || '',
          amount: Number(review.document.paymentCandidate.amount) || 0,
          bankLedger: 'Bank A/c', // Default since not provided in original payload
        },
        student: {
          id: review.document.paymentCandidate.studentId,
          name: 'Student', // studentName is not available on studentPaymentCandidate
        },
      };

      const canonicalModel = this.draftAdapter.map(
        legacyPayload,
        review.document.paymentCandidate.id,
      );

      await this.draftService.createDraft(canonicalModel, 'manual-reviewer');
    }

    return { id, status: 'APPROVED' };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('StudentFee.Resolve')
  async rejectReview(@Param('id') id: string) {
    const review = await this.prisma.studentManualReviewRoute.findUnique({
      where: { id },
    });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.studentManualReviewRoute.update({
        where: { id },
        data: { status: 'REJECTED', resolvedAt: new Date() },
      });
      await tx.emailDocument.update({
        where: { id: review.documentId },
        data: { status: 'EXTRACTION_FAILED' }, // Mark as rejected/failed
      });
      await tx.studentPaymentAudit.create({
        data: {
          documentId: review.documentId,
          action: 'MANUAL_REVIEW_REJECTED',
          metadata: { routeId: id },
        },
      });
    });

    return { id, status: 'REJECTED' };
  }
}

@Controller('student-fees/allocations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FeeAllocationController {
  @Get(':id')
  @RequirePermissions('StudentFee.Read')
  async getAllocation(@Param('id') id: string) {
    return { id, status: 'ALLOCATED' };
  }
}
