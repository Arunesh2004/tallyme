// dead-letter/index.ts
import { Injectable } from '@nestjs/common';
import { ILogger } from '../../../shared/observability';

export interface DeadLetterRecord {
  jobId: string;
  queueName: string;
  payload: string;
  errorReason: string;
  failedAt: Date;
}

@Injectable()
export class DeadLetterQueue {
  constructor(private readonly logger: ILogger) {}

  async moveToDLQ(record: DeadLetterRecord): Promise<void> {
    // In reality, this would save to a specialized DLQ table or Redis stream
    this.logger.error(
      `Job ${record.jobId} from ${record.queueName} moved to DLQ. Reason: ${record.errorReason}`,
    );
  }
}

// scheduler/index.ts
@Injectable()
export class DelayedJobScheduler {
  constructor(private readonly queueRegistry: any /* QueueRegistry */) {}

  async schedule(
    queueName: string,
    eventName: string,
    payload: any,
    delayMs: number,
  ): Promise<void> {
    const queue = this.queueRegistry.getQueue(queueName);
    if (queue) {
      await queue.add(eventName, payload, { delay: delayMs });
    }
  }
}
