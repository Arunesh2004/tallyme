import { SyncJobPayload } from './SyncJobPayload';

export interface SyncContext {
  jobId: string;
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  correlationId?: string;
  createdAt: Date;
  attempt: number;
}

export function createSyncContext(jobId: string, payload: SyncJobPayload, attempt: number): SyncContext {
  return {
    jobId,
    eventId: payload.eventId,
    aggregateId: payload.aggregateId,
    aggregateType: payload.aggregateType,
    correlationId: payload.correlationId,
    createdAt: payload.createdAt,
    attempt
  };
}
