// OutboxEvent.ts
export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: string; // JSON serialized
  metadata: string; // JSON serialized
  createdAt: Date;
  processedAt: Date | null;
  error: string | null;
}

// OutboxRepository.ts
export interface OutboxRepository {
  save(event: OutboxEvent, txContext: any): Promise<void>;
  saveBatch(events: OutboxEvent[], txContext: any): Promise<void>;
  findUnprocessed(batchSize: number): Promise<OutboxEvent[]>;
  markAsProcessed(eventId: string): Promise<void>;
  markAsFailed(eventId: string, error: string): Promise<void>;
}

// OutboxSerializer.ts
export interface OutboxSerializer {
  serialize(event: any): { payload: string; metadata: string };
  deserialize(outboxEvent: OutboxEvent): any;
}

// OutboxMapper.ts
export interface OutboxMapper {
  toOutboxEvent(event: any): OutboxEvent;
  toDomainEvent(outboxEvent: OutboxEvent): any;
}

// index.ts
export * from './OutboxEvent';
export * from './OutboxRepository';
export * from './OutboxSerializer';
export * from './OutboxMapper';
