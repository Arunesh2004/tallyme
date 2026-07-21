import { Event } from './EventContracts';
import { logger } from '../logging/logger';

type EventHandler = (event: Event) => Promise<void>;

export class EventDispatcher {
  private static subscribers = new Map<string, EventHandler[]>();

  static subscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.subscribers.get(eventType) || [];
    handlers.push(handler);
    this.subscribers.set(eventType, handlers);
  }

  static async dispatch(event: Event): Promise<void> {
    const handlers = this.subscribers.get(event.eventType) || [];
    
    if (handlers.length === 0) {
      logger.debug({ eventType: event.eventType }, 'No local subscribers found for event.');
      return;
    }

    // Dispatch locally (In-memory for Domain Events)
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error: any) {
        logger.error({ 
          eventType: event.eventType, 
          eventId: event.eventId,
          error: error.message 
        }, 'Error executing local event handler.');
      }
    }
  }
}
