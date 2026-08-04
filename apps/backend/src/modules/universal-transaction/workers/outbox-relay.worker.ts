import { Injectable, Logger, Inject, forwardRef, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { ApprovalDispatchService } from '../services/approval-dispatch.service';
import { TransactionDraftService } from '../services/transaction-draft.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { LearningFeedbackService } from '../../accounting-intelligence/learning-feedback/learning-feedback.service';

@Injectable()
export class OutboxRelayWorker implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayWorker.name);
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(
    private readonly outboxRepository: TransactionOutboxRepository,
    private readonly dispatchService: ApprovalDispatchService,
    @Inject(forwardRef(() => TransactionDraftService)) private readonly draftService: TransactionDraftService,
    private readonly prometheusService: PrometheusService,
    private readonly learningFeedbackService: LearningFeedbackService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processPendingEvents() {
    if (this.isShuttingDown || this.isProcessing) return;
    this.isProcessing = true;
    try {
      const processingEvents = await this.outboxRepository.claimEvents(50);
      if (processingEvents.length === 0) return;
      this.prometheusService.outboxPendingTotal.inc(processingEvents.length);

      this.logger.log(`Found ${processingEvents.length} outbox events ready for processing.`);

      for (const event of processingEvents) {
        const timer = this.prometheusService.relayProcessingSeconds.startTimer();
        try {
          const payload = event.payload as any;

          if (event.eventType === 'DRAFT_APPROVED') {
            if (!payload?.draftId) throw new Error('draftId missing in event payload');
            await this.dispatchService.dispatchApprovedDraft(payload.draftId);
          } else if (event.eventType === 'VOUCHER_CREATED') {
            if (!payload?.draftId) throw new Error('draftId missing in event payload');
            await this.draftService.updateStatus(payload.draftId, 'QUEUED');
          } else if (event.eventType === 'ERP_SYNC_COMPLETED') {
            if (!payload?.draftId) throw new Error('draftId missing in event payload');
            await this.draftService.updateStatus(payload.draftId, 'SYNCED');
            // Trigger learning ONLY after successful sync
            await this.learningFeedbackService.learnFromDraft(payload.draftId);
          } else if (event.eventType === 'ERP_SYNC_FAILED') {
            if (!payload?.draftId) throw new Error('draftId missing in event payload');
            await this.draftService.markFailed(payload.draftId, payload.reason || 'ERP sync failed permanently');
          } else {
            this.logger.warn(`Unknown event type ${event.eventType}. Marking failed.`);
            const failedEvent = await this.outboxRepository.markFailed(event.id, 'Unknown event type', event.retryCount);
            if (failedEvent.status === 'DEAD') this.prometheusService.outboxDeadTotal.inc();
            else this.prometheusService.outboxFailedTotal.inc();
            continue;
          }

          await this.outboxRepository.markProcessed(event.id);
          this.logger.log(`Successfully processed event ${event.id} of type ${event.eventType}`);
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to process event ${event.id}: ${errMessage}`);
          const failedEvent = await this.outboxRepository.markFailed(event.id, errMessage, event.retryCount);
          if (failedEvent.status === 'DEAD') this.prometheusService.outboxDeadTotal.inc();
          else this.prometheusService.outboxFailedTotal.inc();
        } finally {
          timer();
        }
      }
    } catch (error) {
      this.logger.error('Outbox processing encountered a fatal error', error instanceof Error ? error.stack : 'Unknown error');
    } finally {
      this.isProcessing = false;
    }
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    this.logger.log('Shutting down OutboxRelayWorker');
  }
}
