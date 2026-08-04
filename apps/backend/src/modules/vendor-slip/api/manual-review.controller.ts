// src/modules/vendor-slip/api/manual-review.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../auth/guards/permissions.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { Inject } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { CompanyContextService } from '../../../core/context/company-context.service';

export class RejectReviewDto {
  reason!: string;
}

/**
 * ManualReviewController — handles the vendor-slip manual review lifecycle.
 * When an InvoiceCandidate enters MANUAL_REVIEW_REQUIRED status, an operator
 * uses these endpoints to approve or reject it.
 *
 * Approval re-enters the candidate into the VendorSlipWorker pipeline, which
 * then produces a VoucherCandidate → Shared Accounting Engine → ERP.
 */
@Controller('manual-review')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ManualReviewController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly logger: LoggerService,
    private readonly companyContext: CompanyContextService,
  ) {}

  /**
   * GET /manual-review
   * Returns all pending ManualReviewTask records for the operator queue.
   */
  @Get()
  @RequirePermissions('ManualReview.Read')
  async listReviews() {
    const tasks = await this.prisma.manualReviewTask.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return { data: tasks };
  }

  /**
   * GET /manual-review/:id
   * Returns a single ManualReviewTask with the linked InvoiceCandidate data.
   */
  @Get(':id')
  @RequirePermissions('ManualReview.Read')
  async getReview(@Param('id') id: string) {
    const task = await this.prisma.manualReviewTask.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`ManualReviewTask not found: ${id}`);
    }

    // Fetch the linked InvoiceCandidate if entityType indicates it
    let candidateDetail: any = null;
    if (task.entityType === 'InvoiceCandidate' && task.entityId) {
      candidateDetail = await this.prisma.invoiceCandidate.findUnique({
        where: { id: task.entityId },
      });
    }

    return { ...task, candidate: candidateDetail };
  }

  /**
   * POST /manual-review/:id/approve
   * Full approval lifecycle:
   * 1. Validate task and candidate exist and are in the correct state
   * 2. Update ManualReviewTask status → RESOLVED
   * 3. Update InvoiceCandidate status → APPROVED
   * 4. Create audit log entry
   * 5. Dispatch candidate back to VendorSlipWorker (which → VoucherBuilder → ERP)
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ManualReview.Resolve')
  async approveReview(@Param('id') id: string, @Req() req: Request) {
    const reviewerUser = req.user as any;
    const reviewerId = reviewerUser?.id ?? 'system';

    // 1. Fetch the ManualReviewTask
    const task = await this.prisma.manualReviewTask.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`ManualReviewTask not found: ${id}`);
    }

    if (task.status !== 'PENDING') {
      throw new BadRequestException(
        `Review task is not in PENDING state (current: ${task.status})`,
      );
    }

    if (task.entityType !== 'InvoiceCandidate' || !task.entityId) {
      throw new BadRequestException(
        'Review task is not linked to an InvoiceCandidate',
      );
    }

    // 2. Fetch the linked InvoiceCandidate
    const candidate = await this.prisma.invoiceCandidate.findUnique({
      where: { id: task.entityId },
    });

    if (!candidate) {
      throw new NotFoundException(
        `InvoiceCandidate not found: ${task.entityId}`,
      );
    }

    if (candidate.status !== 'MANUAL_REVIEW_REQUIRED') {
      throw new BadRequestException(
        `InvoiceCandidate is not in MANUAL_REVIEW_REQUIRED state (current: ${candidate.status})`,
      );
    }

    // 3. Persist approval in a transaction
    await this.prisma.$transaction(async (tx: any) => {
      // Update ManualReviewTask
      await tx.manualReviewTask.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolution: 'APPROVED',
          assignedTo: reviewerId,
        },
      });

      // Update InvoiceCandidate status to APPROVED
      await tx.invoiceCandidate.update({
        where: { id: candidate.id },
        data: { status: 'APPROVED' },
      });

      // Create VendorSlipAudit entry
      await tx.vendorSlipAudit.create({
        data: {
          documentId: candidate.documentId,
          action: 'MANUAL_REVIEW_APPROVED',
          metadata: {
            reviewTaskId: id,
            reviewerId,
            approvedAt: new Date().toISOString(),
          },
        },
      });
    });

    // 4. Dispatch candidate back into the pipeline (VendorSlipWorker → VoucherBuilder → ERP)
    await this.queueService.addJob('vendor-slip-queue', 'process-vendor-slip', {
      candidateId: candidate.id,
      companyId: this.companyContext.getCompanyId(),
    });

    this.logger.log(
      `ManualReview approved: taskId=${id} candidateId=${candidate.id} by reviewer=${reviewerId}`,
      'ManualReviewController',
    );

    return {
      id,
      status: 'APPROVED',
      candidateId: candidate.id,
      message: 'Review approved and pipeline re-triggered',
    };
  }

  /**
   * POST /manual-review/:id/reject
   * 1. Validate task exists and is PENDING
   * 2. Update ManualReviewTask → REJECTED
   * 3. Update InvoiceCandidate → FAILED
   * 4. Create audit log entry
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ManualReview.Resolve')
  async rejectReview(
    @Param('id') id: string,
    @Body() dto: RejectReviewDto,
    @Req() req: Request,
  ) {
    const reviewerUser = req.user as any;
    const reviewerId = reviewerUser?.id ?? 'system';

    const task = await this.prisma.manualReviewTask.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`ManualReviewTask not found: ${id}`);
    }

    if (task.status !== 'PENDING') {
      throw new BadRequestException(
        `Review task is not in PENDING state (current: ${task.status})`,
      );
    }

    const reason = dto?.reason ?? 'Rejected by reviewer';

    await this.prisma.$transaction(async (tx: any) => {
      await tx.manualReviewTask.update({
        where: { id },
        data: {
          status: 'REJECTED',
          resolution: reason,
          assignedTo: reviewerId,
        },
      });

      // Update InvoiceCandidate to FAILED if linked
      if (task.entityType === 'InvoiceCandidate' && task.entityId) {
        await tx.invoiceCandidate.update({
          where: { id: task.entityId },
          data: { status: 'FAILED' },
        });

        // Fetch candidate to get documentId for audit
        const candidate = await tx.invoiceCandidate.findUnique({
          where: { id: task.entityId },
        });

        if (candidate) {
          await tx.vendorSlipAudit.create({
            data: {
              documentId: candidate.documentId,
              action: 'MANUAL_REVIEW_REJECTED',
              metadata: {
                reviewTaskId: id,
                reviewerId,
                reason,
                rejectedAt: new Date().toISOString(),
              },
            },
          });
        }
      }
    });

    this.logger.log(
      `ManualReview rejected: taskId=${id} by reviewer=${reviewerId} reason="${reason}"`,
      'ManualReviewController',
    );

    return { id, status: 'REJECTED', reason };
  }
}
