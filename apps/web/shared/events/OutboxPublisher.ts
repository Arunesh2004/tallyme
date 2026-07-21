import { Event } from './EventContracts';
import { OutboxSerializer } from './OutboxSerializer';
import { EventRegistry } from './EventRegistry';
import { logger } from '../logging/logger';

export class OutboxPublisher {
  // Normally injected via constructor
  private outboxRepository: any;

  constructor(outboxRepository: any) {
    this.outboxRepository = outboxRepository;
  }

  async publish(event: Event, dbTransaction: any): Promise<void> {
    if (!EventRegistry.validate(event)) {
      throw new Error(`Event validation failed for type: ${event.eventType}`);
    }

    const envelope = OutboxSerializer.serialize(event);

    // Persist event atomically within the same business transaction
    await this.outboxRepository.save(envelope, dbTransaction);
    
    logger.debug({ eventId: event.eventId, type: event.eventType }, 'Event staged in outbox.');
  }
}
