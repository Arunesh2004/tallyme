// EventMetadata.ts
export interface EventMetadata {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  aggregateId: string;
  aggregateType: string;
  aggregateVersion: number;
  correlationId: string;
  tenantId: string;
  eventVersion: number;
  producer: string;
  [key: string]: any;
}

// Event.ts
export interface Event<T = any> {
  metadata: EventMetadata;
  payload: T;
}

// DomainEvent.ts
export interface DomainEvent<T = any> extends Event<T> {
  _isDomainEvent: true;
}

// IntegrationEvent.ts
export interface IntegrationEvent<T = any> extends Event<T> {
  _isIntegrationEvent: true;
}

// EventEnvelope.ts
export interface EventEnvelope<T = any> {
  metadata: EventMetadata;
  payload: T;
  headers: Record<string, string>;
}

// EventHandler.ts
export interface EventHandler<TEvent extends Event = Event> {
  canHandle(event: TEvent): boolean;
  handle(event: TEvent): Promise<void>;
}

// EventPublisher.ts
export interface EventPublisher {
  publish(event: Event): Promise<void>;
  publishBatch(events: Event[]): Promise<void>;
  publishInTransaction(event: Event, txContext: any): Promise<void>;
}

// EventSubscriber.ts
export interface EventSubscriber {
  subscribe<TEvent extends Event>(eventType: string, handler: EventHandler<TEvent>): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}

// EventDispatcher.ts
export interface EventDispatcher {
  dispatch(event: Event): Promise<void>;
  dispatchAsync(event: Event): Promise<void>;
}

// EventBus.ts
export interface EventBus extends EventPublisher, EventSubscriber, EventDispatcher {}

// index.ts
export * from './EventMetadata';
export * from './Event';
export * from './DomainEvent';
export * from './IntegrationEvent';
export * from './EventEnvelope';
export * from './EventHandler';
export * from './EventPublisher';
export * from './EventSubscriber';
export * from './EventDispatcher';
export * from './EventBus';
