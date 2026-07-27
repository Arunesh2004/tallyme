import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../auth/guards/permissions.guard';
import * as crypto from 'crypto';
import { CompanyContextService } from '../../../core/context/company-context.service';

@Controller('api/vendor-slips/batch-sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BatchSyncController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Post()
  @RequirePermissions('Invoice.Process')
  async createBatchSync(@Body() body: { candidateIds: string[] }) {
    if (
      !body.candidateIds ||
      !Array.isArray(body.candidateIds) ||
      body.candidateIds.length === 0
    ) {
      throw new HttpException(
        'candidateIds array is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const uniqueCandidateIds = Array.from(new Set(body.candidateIds));

    // 1. Idempotency Check
    const sortedIds = [...uniqueCandidateIds].sort();
    const idempotencyHash = crypto
      .createHash('sha256')
      .update(sortedIds.join(','))
      .digest('hex');

    const existingBatch = await this.prisma.batchSyncJob.findUnique({
      where: { idempotencyHash },
    });

    if (existingBatch && existingBatch.status !== 'FAILED') {
      return {
        batchId: existingBatch.id,
        totalInvoices: existingBatch.totalItems,
        queuedInvoices: existingBatch.totalItems,
        message: 'Returned existing active batch',
      };
    }

    // 2. Candidate Existence and Approval Check
    const candidates = await this.prisma.invoiceCandidate.findMany({
      where: { id: { in: uniqueCandidateIds } },
    });

    if (candidates.length !== uniqueCandidateIds.length) {
      throw new HttpException(
        'One or more candidates not found',
        HttpStatus.NOT_FOUND,
      );
    }

    for (const candidate of candidates) {
      if (candidate.status !== 'APPROVED') {
        throw new HttpException(
          `Candidate ${candidate.id} is not APPROVED (status: ${candidate.status})`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // 3. Duplicate Invoice Protection
    const existingItems = await this.prisma.batchSyncItem.findMany({
      where: {
        invoiceCandidateId: { in: uniqueCandidateIds },
        status: {
          in: [
            'PENDING',
            'QUEUED',
            'PROCESSING',
            'VOUCHER_CREATED',
            'ERP_SYNCING',
            'SYNCED',
          ],
        },
      },
      include: { batchJob: true },
    });

    if (existingItems.length > 0) {
      // Check if it's actually an idempotency race condition
      const allSameBatch = existingItems.every(
        (i) => i.batchJob.idempotencyHash === idempotencyHash,
      );
      if (allSameBatch && existingItems[0].batchJob.status !== 'FAILED') {
        return {
          batchId: existingItems[0].batchJob.id,
          totalInvoices: existingItems[0].batchJob.totalItems,
          queuedInvoices: existingItems[0].batchJob.totalItems,
          message: 'Returned existing active batch (resolved race)',
        };
      }

      const conflictedIds = existingItems.map(
        (item) => item.invoiceCandidateId,
      );
      throw new HttpException(
        {
          message:
            'One or more candidates are already in an active or completed batch',
          conflictedIds,
        },
        HttpStatus.CONFLICT,
      );
    }

    // 4. Create Batch
    try {
      const batchJob = await this.prisma.batchSyncJob.create({
        data: {
          idempotencyHash,
          totalItems: candidates.length,
          status: 'PENDING',
          items: {
            create: candidates.map((c) => ({
              invoiceCandidateId: c.id,
              status: 'PENDING',
            })),
          },
        },
      });

      await this.queue.addJob('batch-sync-queue', 'process-batch', {
        batchJobId: batchJob.id,
      });

      return {
        batchId: batchJob.id,
        totalInvoices: batchJob.totalItems,
        queuedInvoices: batchJob.totalItems,
      };
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Race condition caught by unique constraint
        const batch = await this.prisma.batchSyncJob.findUnique({
          where: { idempotencyHash },
        });
        if (batch) {
          return {
            batchId: batch.id,
            totalInvoices: batch.totalItems,
            queuedInvoices: batch.totalItems,
            message: 'Returned existing active batch',
          };
        }
      }
      throw err;
    }
  }

  @Post(':batchId/retry')
  @RequirePermissions('Invoice.Process')
  async retryBatchItems(
    @Param('batchId') batchId: string,
    @Body() body: { itemIds?: string[] },
  ) {
    const batchJob = await this.prisma.batchSyncJob.findUnique({
      where: { id: batchId },
      include: { items: true },
    });

    if (!batchJob) {
      throw new HttpException('Batch Job not found', HttpStatus.NOT_FOUND);
    }

    // Identify failed items to retry
    const failedItems = batchJob.items.filter(
      (item) => item.status === 'FAILED',
    );

    if (failedItems.length === 0) {
      throw new HttpException(
        'No FAILED items found in this batch to retry',
        HttpStatus.BAD_REQUEST,
      );
    }

    const itemsToRetry =
      body.itemIds && body.itemIds.length > 0
        ? failedItems.filter((item) => body.itemIds!.includes(item.id))
        : failedItems;

    if (itemsToRetry.length === 0) {
      throw new HttpException(
        'Provided itemIds are not in FAILED state or do not exist',
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();

    for (const item of itemsToRetry) {
      // 1. Update item status to QUEUED and increment retry count
      await this.prisma.batchSyncItem.update({
        where: { id: item.id },
        data: {
          status: 'QUEUED',
          retryCount: { increment: 1 },
          lastRetryAt: now,
          error: null, // Clear error on retry
          completedAt: null,
        },
      });

      // 2. Dispatch to existing vendor-slip-queue (Vendor Worker) directly
      await this.queue.addJob('vendor-slip-queue', 'process-vendor-slip', {
        candidateId: item.invoiceCandidateId,
        companyId: this.companyContext.getCompanyId(),
        batchSyncItemId: item.id,
      });
    }

    // 3. Update BatchSyncJob status back to PROCESSING if it was COMPLETED or FAILED
    const updatedFailedCount = Math.max(
      0,
      batchJob.failedItems - itemsToRetry.length,
    );
    const updatedProcessingCount =
      batchJob.processingItems + itemsToRetry.length;

    await this.prisma.batchSyncJob.update({
      where: { id: batchId },
      data: {
        status: 'PROCESSING',
        failedItems: updatedFailedCount,
        processingItems: updatedProcessingCount,
        completedAt: null,
      },
    });

    return {
      message: 'Retry initiated',
      batchId,
      retriedItemsCount: itemsToRetry.length,
      itemIds: itemsToRetry.map((i) => i.id),
    };
  }

  @Get(':batchId')
  @RequirePermissions('Invoice.Read')
  async getBatchSyncStatus(@Param('batchId') batchId: string) {
    const batchJob = await this.prisma.batchSyncJob.findUnique({
      where: { id: batchId },
      include: { items: true },
    });

    if (!batchJob) {
      throw new HttpException('Batch Job not found', HttpStatus.NOT_FOUND);
    }

    return {
      batchId: batchJob.id,
      status: batchJob.status,
      queued: batchJob.queuedItems,
      processing: batchJob.processingItems,
      synced: batchJob.syncedItems,
      failed: batchJob.failedItems,
      items: batchJob.items.map((item) => ({
        id: item.id,
        invoiceCandidateId: item.invoiceCandidateId,
        voucherCandidateId: item.voucherCandidateId,
        status: item.status,
        error: item.error,
        retryCount: item.retryCount,
        lastRetryAt: item.lastRetryAt,
      })),
    };
  }
}
