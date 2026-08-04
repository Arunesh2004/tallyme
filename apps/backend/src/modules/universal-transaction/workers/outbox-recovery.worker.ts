import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { DistributedLockService } from '../../../shared/redis/distributed-lock.service';
import * as crypto from 'crypto';

@Injectable()
export class OutboxRecoverySweeper implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxRecoverySweeper.name);
  private isShuttingDown = false;
  private readonly workerId = crypto.randomUUID();

  constructor(
    private readonly outboxRepository: TransactionOutboxRepository,
    private readonly prometheusService: PrometheusService,
    private readonly lockService: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async rescueEvents() {
    if (this.isShuttingDown) return;

    const lockKey = 'cron_lock:outbox_recovery_sweep';
    const lockTtlMs = 60000; // 1 minute
    
    const acquired = await this.lockService.acquireLock(lockKey, this.workerId, lockTtlMs);
    if (!acquired) {
      this.prometheusService.cronLockContentionTotal.inc({ job: 'outbox_recovery_sweep' });
      this.logger.debug('Skipping outbox recovery sweep: lock acquired by another worker');
      return;
    }

    this.prometheusService.cronLockAcquiredTotal.inc({ job: 'outbox_recovery_sweep' });
    try {
      this.logger.log('Running stranded OUTBOX events recovery sweep...');
      // 5 minutes timeout
      const rescuedCount = await this.outboxRepository.rescueStrandedEvents(5);
      if (rescuedCount > 0) {
        this.logger.warn(`Rescued ${rescuedCount} stranded outbox events back to PENDING.`);
      }
    } catch (error) {
      this.prometheusService.cronLockFailedTotal.inc({ job: 'outbox_recovery_sweep' });
      this.logger.error('Failed to run outbox recovery sweeper', error instanceof Error ? error.stack : 'Unknown error');
    } finally {
      await this.lockService.releaseLock(lockKey, this.workerId);
    }
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    this.logger.log('Shutting down OutboxRecoverySweeper');
  }
}
