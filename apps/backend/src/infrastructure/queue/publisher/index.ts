// publisher/index.ts
import { Injectable } from '@nestjs/common';
import { QueueRegistry } from '../bullmq';
import { EventPublisher, Event, OutboxRepository } from '../../../shared/events';
import { ILogger } from '../../../shared/observability';

@Injectable()
export class BullMQEventPublisher implements EventPublisher {
  constructor(private readonly queueRegistry: QueueRegistry) {}

  async publish(event: Event): Promise<void> {
    const queue = this.queueRegistry.getQueue('integration-events'); // Example route
    if (queue) {
      await queue.add(event.metadata.eventType, event);
    }
  }

  async publishBatch(events: Event[]): Promise<void> {
    const queue = this.queueRegistry.getQueue('integration-events');
    if (queue) {
      const jobs = events.map(e => ({ name: e.metadata.eventType, data: e }));
      await queue.addBulk(jobs);
    }
  }

  async publishInTransaction(event: Event, txContext: any): Promise<void> {
    throw new Error('BullMQEventPublisher cannot publish directly in a transaction. Use OutboxRepository.');
  }
}

@Injectable()
export class OutboxPublisher {
  constructor(
    private readonly outboxRepo: OutboxRepository,
    private readonly publisher: EventPublisher,
    private readonly logger: ILogger
  ) {}

  async processUnpublished(): Promise<void> {
    const events = await this.outboxRepo.findUnprocessed(50);
    for (const record of events) {
      try {
        const domainEvent = JSON.parse(record.payload); // Needs actual deserializer
        await this.publisher.publish(domainEvent);
        await this.outboxRepo.markAsProcessed(record.id);
      } catch (e: any) {
        this.logger.error(`Failed to publish outbox event ${record.id}`, e.stack);
        await this.outboxRepo.markAsFailed(record.id, e.message);
      }
    }
  }
}
