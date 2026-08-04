import { Test, TestingModule } from '@nestjs/testing';
import { OutboxCleanupWorker } from './outbox-cleanup.worker';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';

import { DistributedLockService } from '../../../shared/redis/distributed-lock.service';

describe('OutboxCleanupWorker', () => {
  let worker: OutboxCleanupWorker;
  let repo: jest.Mocked<TransactionOutboxRepository>;

  beforeEach(async () => {
    const mockRepo = {
      deleteOldProcessed: jest.fn(),
    };

    const mockPrometheus = {
      cleanupDeletedTotal: { inc: jest.fn() },
      cronLockAcquiredTotal: { inc: jest.fn() },
      cronLockContentionTotal: { inc: jest.fn() },
      cronLockFailedTotal: { inc: jest.fn() },
    };

    const mockLockService = {
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxCleanupWorker,
        { provide: TransactionOutboxRepository, useValue: mockRepo },
        { provide: PrometheusService, useValue: mockPrometheus },
        { provide: DistributedLockService, useValue: mockLockService },
      ],
    }).compile();

    worker = module.get<OutboxCleanupWorker>(OutboxCleanupWorker);
    repo = module.get(TransactionOutboxRepository);
  });

  it('should call deleteOldProcessed with 30 days on cleanup', async () => {
    repo.deleteOldProcessed.mockResolvedValue(10);
    
    await worker.handleCleanup();

    expect(repo.deleteOldProcessed).toHaveBeenCalledWith(30);
  });
});
