import { EventDispatcher, Event } from '../contracts/index';
import { HandlerRegistry } from '../abstractions'; // Actually from registry, bundled above

export class InMemoryEventDispatcher implements EventDispatcher {
  constructor(private readonly registry: HandlerRegistry) {}

  async dispatch(event: Event): Promise<void> {
    const handlers = this.registry.getHandlers(event.metadata.eventType);

    // Synchronous dispatch in sequence
    for (const handler of handlers) {
      if (handler.canHandle(event)) {
        await handler.handle(event);
      }
    }
  }

  async dispatchAsync(event: Event): Promise<void> {
    const handlers = this.registry.getHandlers(event.metadata.eventType);

    // Fire and forget, or `Promise.all` in background
    Promise.all(
      handlers
        .filter((handler) => handler.canHandle(event))
        .map((handler) =>
          handler.handle(event).catch((err) => {
            // In a real system, you'd inject a Logger here
            console.error(
              `Async dispatch failed for event ${event.metadata.eventType}`,
              err,
            );
          }),
        ),
    );
  }
}

export class EventDispatcherFactory {
  static createInMemory(registry: HandlerRegistry): EventDispatcher {
    return new InMemoryEventDispatcher(registry);
  }
}
