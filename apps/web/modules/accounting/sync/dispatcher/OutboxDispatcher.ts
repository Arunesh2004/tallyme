import { prisma } from '../../../../shared/db/prisma';
import { SyncQueueService } from '../queue/SyncQueueService';
import { SyncJobPayload } from '../types/SyncJobPayload';
import { logger } from '../../../../shared/logging/logger';
import { EventStatus } from '@prisma/client';

export class OutboxDispatcher {
  constructor(private queueService: SyncQueueService) {}

  /**
   * Reads pending events from EventOutbox and dispatches them to the Sync Queue.
   * Uses optimistic locking (status transition from PENDING -> PROCESSING) to prevent double processing.
   */
  public async dispatchPendingEvents(batchSize: number = 50): Promise<number> {
    try {
      // Find events that are PENDING or have been RETRYING and are due
      // For simplicity, we just pick PENDING events for immediate dispatch.
      // Retry scheduling logic is handled natively by BullMQ, so we don't need to re-query FAILED/RETRYING from outbox unless DLQ is involved.
      const pendingEvents = await prisma.eventOutbox.findMany({
        where: {
          status: EventStatus.PENDING,
        },
        take: batchSize,
        orderBy: {
          createdAt: 'asc'
        }
      });

      if (pendingEvents.length === 0) {
        return 0;
      }

      logger.info({ count: pendingEvents.length }, 'Found pending outbox events for dispatch');

      let dispatchedCount = 0;

      for (const event of pendingEvents) {
        // Optimistic lock
        const updated = await prisma.eventOutbox.updateMany({
          where: {
            eventId: event.eventId,
            status: EventStatus.PENDING, // Ensure it hasn't been locked by another dispatcher instance
          },
          data: {
            status: EventStatus.PROCESSING
          }
        });

        if (updated.count > 0) {
          const payload: SyncJobPayload = {
            eventId: event.eventId,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            correlationId: event.correlationId || undefined,
            createdAt: event.createdAt
          };

          await this.queueService.enqueueEvent(payload);
          dispatchedCount++;
        }
      }

      return dispatchedCount;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed during outbox dispatch loop');
      return 0;
    }
  }
}
