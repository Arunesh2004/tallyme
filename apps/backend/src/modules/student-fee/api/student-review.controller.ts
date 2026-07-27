// src/modules/student-fee/api/student-review.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../auth/guards/permissions.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { VOUCHER_BUILDER_QUEUE } from '../../voucher-builder/constants/voucher.constants';
import { CompanyContextService } from '../../../core/context/company-context.service';

@Controller('student-fees/manual-review')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StudentManualReviewController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly companyContext: CompanyContextService,
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
      await this.queueService.addJob(
        VOUCHER_BUILDER_QUEUE,
        'build-student-voucher',
        {
          candidateId: review.document.paymentCandidate.id,
          companyId: this.companyContext.getCompanyId(),
        },
      );
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
