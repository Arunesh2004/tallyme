export interface EventMetadata {
  traceId?: string;
  correlationId?: string;
  userId?: string;
  clientIp?: string;
}

export interface Event {
  eventId: string;
  eventType: string;
  aggregateId: string;
  organizationId: string;
  occurredAt: Date;
  version: number;
  metadata?: EventMetadata;
  payload: any;
}

export interface DomainEvent extends Event {
  isDomainEvent: true;
}

export interface IntegrationEvent extends Event {
  isIntegrationEvent: true;
}

export interface EventEnvelope {
  id: string;
  type: string;
  aggregateId: string;
  organizationId: string;
  timestamp: string;
  version: number;
  metadata: EventMetadata;
  data: any;
}
