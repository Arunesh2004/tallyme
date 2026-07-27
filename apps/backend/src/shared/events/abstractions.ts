// serialization/EventSerializer.ts
export interface EventSerializer<TEvent = any, TRaw = string> {
  serialize(event: TEvent): TRaw;
}

// serialization/EventDeserializer.ts
export interface EventDeserializer<TRaw = string, TEvent = any> {
  deserialize(raw: TRaw): TEvent;
}

// registry/EventRegistry.ts
export interface EventRegistry {
  registerEventType(eventType: string, eventConstructor: any): void;
  getEventType(eventType: string): any | undefined;
}

// registry/HandlerRegistry.ts
import { EventHandler } from './contracts';
export interface HandlerRegistry {
  registerHandler(eventType: string, handler: EventHandler): void;
  getHandlers(eventType: string): EventHandler[];
}
