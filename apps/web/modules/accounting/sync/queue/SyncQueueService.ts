import { accountingSyncQueue } from './AccountingSyncQueue';
import { SyncJobPayload } from '../types/SyncJobPayload';
import { logger } from '../../../../shared/logging/logger';

export class SyncQueueService {
  /**
   * Enqueues an Outbox event into the BullMQ Sync queue.
   */
  public async enqueueEvent(payload: SyncJobPayload): Promise<string> {
    try {
      const jobName = `Sync_${payload.aggregateType}_${payload.aggregateId}`;
      const job = await accountingSyncQueue.add(jobName, payload, {
        jobId: payload.eventId // Enforce idempotency via Event ID
      });
      
      logger.info({ eventId: payload.eventId, jobId: job.id }, 'Enqueued Sync Job');
      return job.id as string;
    } catch (error: any) {
      logger.error({ error: error.message, eventId: payload.eventId }, 'Failed to enqueue Sync Job');
      throw error;
    }
  }
}
