import { Event, EventEnvelope } from './EventContracts';

export class OutboxSerializer {
  static serialize(event: Event): EventEnvelope {
    return {
      id: event.eventId,
      type: event.eventType,
      aggregateId: event.aggregateId,
      organizationId: event.organizationId,
      timestamp: event.occurredAt.toISOString(),
      version: event.version,
      metadata: event.metadata || {},
      data: event.payload,
    };
  }

  static deserialize(envelopeRaw: any): Event {
    // In a full implementation, this parses JSON strings back into strongly-typed Events
    return {
      eventId: envelopeRaw.id,
      eventType: envelopeRaw.type,
      aggregateId: envelopeRaw.aggregateId,
      organizationId: envelopeRaw.organizationId,
      occurredAt: new Date(envelopeRaw.timestamp),
      version: envelopeRaw.version,
      metadata: envelopeRaw.metadata,
      payload: envelopeRaw.data,
    };
  }
}
