import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutboxDispatcher } from '../../../../modules/accounting/sync/dispatcher/OutboxDispatcher';
import { SyncQueueService } from '../../../../modules/accounting/sync/queue/SyncQueueService';
import { prisma } from '../../../../shared/db/prisma';

vi.mock('../../../../shared/config/env', () => ({
  env: { REDIS_URL: 'mock', DATABASE_URL: 'mock', NEXTAUTH_SECRET: 'mock' }
}));

vi.mock('../../../../shared/db/prisma', () => ({
  prisma: {
    eventOutbox: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    }
  }
}));

describe('OutboxDispatcher', () => {
  let dispatcher: OutboxDispatcher;
  let queueService: SyncQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    queueService = {
      enqueueEvent: vi.fn().mockResolvedValue('job-123')
    } as unknown as SyncQueueService;
    dispatcher = new OutboxDispatcher(queueService);
  });

  it('should dispatch pending events and update status to PROCESSING', async () => {
    const mockEvents = [
      { eventId: 'event-1', aggregateId: 'agg-1', aggregateType: 'Voucher', createdAt: new Date() }
    ];

    (prisma.eventOutbox.findMany as any).mockResolvedValue(mockEvents);
    (prisma.eventOutbox.updateMany as any).mockResolvedValue({ count: 1 });

    const count = await dispatcher.dispatchPendingEvents();

    expect(count).toBe(1);
    expect(prisma.eventOutbox.findMany).toHaveBeenCalled();
    expect(prisma.eventOutbox.updateMany).toHaveBeenCalled();
    expect(queueService.enqueueEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'event-1',
      aggregateType: 'Voucher'
    }));
  });

  it('should return 0 if no pending events found', async () => {
    (prisma.eventOutbox.findMany as any).mockResolvedValue([]);

    const count = await dispatcher.dispatchPendingEvents();

    expect(count).toBe(0);
    expect(queueService.enqueueEvent).not.toHaveBeenCalled();
  });
});
