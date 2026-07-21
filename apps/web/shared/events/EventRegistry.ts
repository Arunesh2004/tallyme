import { Event } from './EventContracts';
import { logger } from '../logging/logger';

export class EventRegistry {
  private static registeredEvents = new Map<string, any>();

  static register(eventType: string, schema: any): void {
    if (this.registeredEvents.has(eventType)) {
      logger.warn({ eventType }, 'Event type already registered. Overwriting is not permitted.');
      return;
    }
    this.registeredEvents.set(eventType, schema);
    logger.debug({ eventType }, 'Event registered successfully.');
  }

  static validate(event: Event): boolean {
    const schema = this.registeredEvents.get(event.eventType);
    if (!schema) {
      logger.error({ eventType: event.eventType }, 'Attempted to validate an unregistered event type.');
      return false;
    }
    // Zod schema validation would occur here
    // return schema.safeParse(event.payload).success;
    return true;
  }
}
