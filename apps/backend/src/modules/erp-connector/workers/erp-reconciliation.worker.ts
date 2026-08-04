import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaERPRepository } from '../repositories/prisma-erp.repository';
import { TallyTransportService } from '../services/transport.service';
import { ERPSyncStatus } from '@prisma/client';
import { TransactionOutboxRepository } from '../../universal-transaction/repositories/transaction-outbox.repository';
import { ERP_REPOSITORY } from '../constants/erp.constants';
import { TallyXmlBuilderService } from '../services/xml-builder.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';

import { DistributedLockService } from '../../../shared/redis/distributed-lock.service';
import * as crypto from 'crypto';

@Injectable()
export class ERPReconciliationWorker implements OnModuleDestroy {
  private readonly logger = new Logger(ERPReconciliationWorker.name);
  private isShuttingDown = false;
  private readonly workerId = crypto.randomUUID();

  constructor(
    @Inject(ERP_REPOSITORY)
    private readonly erpRepository: PrismaERPRepository,
    private readonly transportService: TallyTransportService,
    private readonly outboxRepository: TransactionOutboxRepository,
    private readonly xmlBuilder: TallyXmlBuilderService,
    private readonly prisma: PrismaService,
    private readonly prometheusService: PrometheusService,
    private readonly lockService: DistributedLockService,
  ) {}

  async onModuleDestroy() {
    this.logger.log('Shutting down ERPReconciliationWorker...');
    this.isShuttingDown = true;
  }

  @Cron('0 */15 * * * *')
  async handleReconciliation() {
    if (this.isShuttingDown) {
      this.logger.log('Skipping ERP reconciliation: System is shutting down');
      return;
    }

    const lockKey = 'cron_lock:erp_reconciliation';
    const lockTtlMs = 120000; // 2 minutes
    
    const acquired = await this.lockService.acquireLock(lockKey, this.workerId, lockTtlMs);
    if (!acquired) {
      this.prometheusService.cronLockContentionTotal.inc({ job: 'erp_reconciliation' });
      this.logger.debug('Skipping ERP reconciliation: lock acquired by another worker');
      return;
    }

    this.prometheusService.cronLockAcquiredTotal.inc({ job: 'erp_reconciliation' });
    this.logger.log('Starting ERP Reconciliation worker...');
    try {
      // Find jobs stuck in SYNCING for more than 10 minutes
      const strandedJobs = await this.erpRepository.findStrandedSyncJobs(10);
      
      for (const job of strandedJobs) {
        this.logger.log(`Reconciling stranded ERP Sync Job: ${job.id}`);
        
        try {
          const voucherExistsInERP = await this.queryERPForVoucher(job);
          this.prometheusService.reconciliationTotal.inc();

          if (voucherExistsInERP) {
            await this.erpRepository.updateJobStatus(job.id, ERPSyncStatus.SYNCED, {
              statusFrom: ERPSyncStatus.SYNCING,
              reason: 'Reconciled successfully against ERP',
            });
            
            await this.outboxRepository.createEvent({
              aggregateType: 'VoucherCandidate',
              aggregateId: job.voucherCandidateId,
              eventType: 'ERP_SYNC_COMPLETED',
              payload: { jobId: job.id, erpReferenceId: job.erpReferenceId },
            });
            this.logger.log(`Job ${job.id} reconciled as SYNCED.`);
          } else {
            await this.erpRepository.updateJobStatus(job.id, ERPSyncStatus.PENDING, {
              statusFrom: ERPSyncStatus.SYNCING,
              reason: 'Reconciliation failed, voucher not found in ERP. Returning to retry flow.',
            });
            this.logger.log(`Job ${job.id} returned to PENDING for retry.`);
          }
        } catch (err) {
          this.logger.warn(`Reconciliation query failed for job ${job.id}, preserving SYNCING state`);
        }
      }
    } catch (error) {
      this.prometheusService.cronLockFailedTotal.inc({ job: 'erp_reconciliation' });
      this.logger.error('ERP Reconciliation failed', error);
    } finally {
      await this.lockService.releaseLock(lockKey, this.workerId);
    }
  }

  private async queryERPForVoucher(job: any): Promise<boolean> {
    try {
      const voucher = await this.prisma.voucherCandidate.findUnique({
        where: { id: job.voucherCandidateId },
      });
      const voucherNumber = voucher?.voucherNumber || job.erpReferenceId;
      
      if (!voucherNumber) {
        this.logger.warn(`Cannot reconcile job ${job.id} without voucher number`);
        return false;
      }

      const exportXml = await this.xmlBuilder.buildExportXml({ voucherNumber });
      
      const transportResult = await this.transportService.send(exportXml, {
        voucherId: job.voucherCandidateId,
        jobId: job.id,
        queueName: 'tally-reconciliation',
        attemptNumber: 1,
      });

      if (!transportResult.success) {
        throw new Error(`Transport failed: ${transportResult.httpStatus}`);
      }

      // Check for <VOUCHER> or <VOUCHER tag in the raw response
      return (transportResult.rawResponse?.includes('<VOUCHER') || false);
    } catch (error) {
      this.logger.error(`Reconciliation query failed for job ${job.id}`, error);
      throw error; // Throw so that we skip marking it as failed and keep SYNCING
    }
  }
}
