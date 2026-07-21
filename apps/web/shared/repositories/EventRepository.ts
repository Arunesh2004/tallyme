import { EventEnvelope } from '../events/EventContracts';

export interface EventRepository {
  findById(eventId: string): Promise<EventEnvelope | null>;
  findRecentByAggregate(aggregateId: string, limit?: number): Promise<EventEnvelope[]>;
}

export interface OutboxRepository {
  save(envelope: EventEnvelope, transaction: any): Promise<void>;
  findUnpublished(limit?: number): Promise<EventEnvelope[]>;
  markAsPublished(eventIds: string[]): Promise<void>;
}

export interface FailedEventRepository {
  saveFailure(envelope: EventEnvelope, errorReason: string): Promise<void>;
  incrementRetry(eventId: string): Promise<void>;
  findPendingRetries(): Promise<EventEnvelope[]>;
}
