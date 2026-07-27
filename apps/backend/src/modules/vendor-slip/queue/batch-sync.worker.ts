import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { Inject } from '@nestjs/common';

@Processor('batch-sync-queue')
export class BatchSyncWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      const { batchJobId, companyId } = job.data;
      this.logger.log(
        `Processing Batch Sync Job: ${batchJobId}`,
        'BatchSyncWorker',
      );

      const batchJob = await this.prisma.batchSyncJob.findUnique({
        where: { id: batchJobId },
        include: { items: true },
      });

      if (!batchJob) {
        this.logger.error(
          `BatchJob not found: ${batchJobId}`,
          '',
          'BatchSyncWorker',
        );
        return;
      }

      await this.prisma.batchSyncJob.update({
        where: { id: batchJobId },
        data: { status: 'PROCESSING', processingItems: batchJob.items.length },
      });

      for (const item of batchJob.items) {
        try {
          // Update item status to QUEUED
          await this.prisma.batchSyncItem.update({
            where: { id: item.id },
            data: { status: 'QUEUED' },
          });

          // Dispatch to existing vendor-slip-queue (Vendor Worker)
          // The Vendor Worker expects { candidateId, companyId, batchSyncItemId }
          await this.queueService.addJob(
            'vendor-slip-queue',
            'process-vendor-slip',
            {
              candidateId: item.invoiceCandidateId,
              companyId: companyId,
              batchSyncItemId: item.id,
            },
          );
        } catch (err: any) {
          this.logger.error(
            `Failed to queue item ${item.id}`,
            err.stack,
            'BatchSyncWorker',
          );
          await this.prisma.batchSyncItem.update({
            where: { id: item.id },
            data: {
              status: 'FAILED',
              error: err.message,
              completedAt: new Date(),
            },
          });

          // Increment failed items in BatchSyncJob
          await this.prisma.batchSyncJob.update({
            where: { id: batchJobId },
            data: { failedItems: { increment: 1 } },
          });
        }
      }

      this.logger.log(
        `Successfully dispatched all items for Batch Sync Job: ${batchJobId}`,
        'BatchSyncWorker',
      );
    } catch (err: any) {
      this.logger.error(err.message, err.stack, 'BatchSyncWorker');
      throw err;
    }
  }
}
