import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaVoucherRepository } from '../repositories/prisma-voucher.repository';
import { IVoucherRepository } from '../interfaces/voucher.interfaces';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { VOUCHER_REPOSITORY } from '../constants/voucher.constants';

import { DistributedLockService } from '../../../shared/redis/distributed-lock.service';
import * as crypto from 'crypto';

@Injectable()
export class VoucherCleanupWorker implements OnModuleDestroy {
  private readonly logger = new Logger(VoucherCleanupWorker.name);
  private isShuttingDown = false;
  private readonly workerId = crypto.randomUUID();

  constructor(
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepository: PrismaVoucherRepository,
    private readonly prometheusService: PrometheusService,
    private readonly lockService: DistributedLockService,
  ) {}

  async onModuleDestroy() {
    this.logger.log('Shutting down VoucherCleanupWorker...');
    this.isShuttingDown = true;
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  async handleCleanup() {
    if (this.isShuttingDown) {
      this.logger.log('Skipping voucher cleanup: System is shutting down');
      return;
    }

    const lockKey = 'cron_lock:voucher_cleanup';
    const lockTtlMs = 60000; // 1 minute
    
    const acquired = await this.lockService.acquireLock(lockKey, this.workerId, lockTtlMs);
    if (!acquired) {
      this.prometheusService.cronLockContentionTotal.inc({ job: 'voucher_cleanup' });
      this.logger.debug('Skipping voucher cleanup: lock acquired by another worker');
      return;
    }

    this.prometheusService.cronLockAcquiredTotal.inc({ job: 'voucher_cleanup' });
    this.logger.log('Starting Voucher cleanup worker...');
    try {
      const deletedCount = await this.voucherRepository.deleteOldObsoleteCandidates(90);
      if (deletedCount > 0) {
        this.prometheusService.cleanupDeletedTotal.inc({ type: 'voucher' }, deletedCount);
      }
      this.logger.log(`Voucher cleanup completed. Deleted ${deletedCount} obsolete candidates older than 90 days.`);
    } catch (error) {
      this.prometheusService.cronLockFailedTotal.inc({ job: 'voucher_cleanup' });
      this.logger.error('Voucher cleanup failed', error);
    } finally {
      await this.lockService.releaseLock(lockKey, this.workerId);
    }
  }
}
