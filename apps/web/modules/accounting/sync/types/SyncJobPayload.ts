export interface SyncJobPayload {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  correlationId?: string;
  createdAt: Date;
}
