import { Injectable, Inject } from '@nestjs/common';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { LoggerService } from '../../../core/logger/logger.service';
import { VOUCHER_BUILDER_QUEUE } from '../../voucher-builder/constants/voucher.constants';
import { propagation, context } from '@opentelemetry/api';
import { CorrelationContext } from '../../../shared/observability/context';

@Injectable()
export class ApprovalDispatchService {
  constructor(
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly logger: LoggerService,
  ) {}

  async dispatchApprovedDraft(draftId: string): Promise<void> {
    try {
      this.logger.log(
        `Dispatching approved draft to Voucher Builder: ${draftId}`,
        'ApprovalDispatchService',
      );
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);

      await this.queueService.addJob(
        VOUCHER_BUILDER_QUEUE,
        'build-draft-voucher',
        { 
          draftId, 
          traceparent: carrier.traceparent,
          correlationId: CorrelationContext.getCorrelationId(),
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to dispatch approved draft ${draftId} to Voucher Builder. Draft is approved but stranded.`,
        (err as Error).stack,
        'ApprovalDispatchService',
      );
      // The error is intentionally thrown so the OutboxRelayWorker
      // can catch it, update the retry count, and apply backoff.
      throw err;
    }
  }
}
