import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';

import { DistributedLockService } from '../../../shared/redis/distributed-lock.service';
import * as crypto from 'crypto';

@Injectable()
export class OutboxCleanupWorker implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxCleanupWorker.name);
  private isShuttingDown = false;
  private readonly workerId = crypto.randomUUID();

  constructor(
    private readonly outboxRepository: TransactionOutboxRepository,
    private readonly prometheusService: PrometheusService,
    private readonly lockService: DistributedLockService,
  ) {}

  async onModuleDestroy() {
    this.logger.log('Shutting down OutboxCleanupWorker...');
    this.isShuttingDown = true;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    if (this.isShuttingDown) {
      this.logger.log('Skipping outbox cleanup: System is shutting down');
      return;
    }

    const lockKey = 'cron_lock:outbox_cleanup';
    const lockTtlMs = 60000; // 1 minute
    
    const acquired = await this.lockService.acquireLock(lockKey, this.workerId, lockTtlMs);
    if (!acquired) {
      this.prometheusService.cronLockContentionTotal.inc({ job: 'outbox_cleanup' });
      this.logger.debug('Skipping outbox cleanup: lock acquired by another worker');
      return;
    }

    this.prometheusService.cronLockAcquiredTotal.inc({ job: 'outbox_cleanup' });
    this.logger.log('Starting Outbox cleanup worker...');
    try {
      const deletedCount = await this.outboxRepository.deleteOldProcessed(30);
      if (deletedCount > 0) {
        this.prometheusService.cleanupDeletedTotal.inc({ type: 'outbox' }, deletedCount);
      }
      this.logger.log(`Outbox cleanup completed. Deleted ${deletedCount} PROCESSED events older than 30 days.`);
    } catch (error) {
      this.prometheusService.cronLockFailedTotal.inc({ job: 'outbox_cleanup' });
      this.logger.error('Outbox cleanup failed', error);
    } finally {
      await this.lockService.releaseLock(lockKey, this.workerId);
    }
  }
}
