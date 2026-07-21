// serialization/EventSerializer.ts
export interface EventSerializer<TEvent = any, TRaw = string> {
  serialize(event: TEvent): TRaw;
}

// serialization/EventDeserializer.ts
export interface EventDeserializer<TRaw = string, TEvent = any> {
  deserialize(raw: TRaw): TEvent;
}

// serialization/index.ts
export * from './EventSerializer';
export * from './EventDeserializer';

// registry/EventRegistry.ts
export interface EventRegistry {
  registerEventType(eventType: string, eventConstructor: any): void;
  getEventType(eventType: string): any | undefined;
}

// registry/HandlerRegistry.ts
import { EventHandler } from '../contracts/index';
export interface HandlerRegistry {
  registerHandler(eventType: string, handler: EventHandler): void;
  getHandlers(eventType: string): EventHandler[];
}

// registry/index.ts
export * from './EventRegistry';
export * from './HandlerRegistry';
