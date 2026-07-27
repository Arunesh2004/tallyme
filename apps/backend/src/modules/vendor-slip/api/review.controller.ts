// src/modules/vendor-slip/api/review.controller.ts
import {
  Controller,
  Get,
  Put,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../auth/guards/permissions.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { Inject } from '@nestjs/common';
import { CompanyContextService } from '../../../core/context/company-context.service';

/**
 * ReviewController — protected by JWT authentication + permissions.
 * All endpoints require a valid Bearer token. The class-level guard
 * ensures that unauthenticated callers receive 401 on every route.
 */
@Controller('vendor-slips')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReviewController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Get('review')
  @RequirePermissions('Invoice.Read')
  async getPendingReviews() {
    const pending = await this.prisma.invoiceCandidate.findMany({
      where: {
        status: 'MANUAL_REVIEW_REQUIRED',
      },
    });

    return pending.map((p: any) => ({
      id: p.id,
      documentId: p.documentId,
      invoiceNumber: p.invoiceNumber,
      date: p.date,
      total: p.total,
      extractedGstin: p.extractedGstin,
      status: p.status,
    }));
  }

  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Invoice.Process')
  async approveInvoice(@Param('id') id: string) {
    const candidate = await this.prisma.invoiceCandidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      throw new NotFoundException(`InvoiceCandidate not found: ${id}`);
    }

    if (candidate.status !== 'MANUAL_REVIEW_REQUIRED') {
      return { message: `Invoice is currently in status: ${candidate.status}` };
    }

    await this.prisma.invoiceCandidate.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    // Dispatch back to BullMQ to continue the pipeline
    await this.queueService.addJob('vendor-slip-queue', 'process-vendor-slip', {
      candidateId: candidate.id,
      companyId: this.companyContext.getCompanyId(),
    });

    return { status: 'APPROVED', candidateId: candidate.id };
  }
}
