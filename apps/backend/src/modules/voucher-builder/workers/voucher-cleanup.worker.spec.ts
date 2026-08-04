import { Test, TestingModule } from '@nestjs/testing';
import { VoucherCleanupWorker } from './voucher-cleanup.worker';
import { PrismaVoucherRepository } from '../repositories/prisma-voucher.repository';
import { VOUCHER_REPOSITORY } from '../constants/voucher.constants';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';

import { DistributedLockService } from '../../../shared/redis/distributed-lock.service';

describe('VoucherCleanupWorker', () => {
  let worker: VoucherCleanupWorker;
  let repo: jest.Mocked<PrismaVoucherRepository>;
  let mockLockService: any;
  let mockPrometheus: any;

  beforeEach(async () => {
    const mockRepo = {
      deleteOldObsoleteCandidates: jest.fn(),
    };

    mockPrometheus = {
      cleanupDeletedTotal: { inc: jest.fn() },
      cronLockAcquiredTotal: { inc: jest.fn() },
      cronLockContentionTotal: { inc: jest.fn() },
      cronLockFailedTotal: { inc: jest.fn() },
    };

    mockLockService = {
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherCleanupWorker,
        { provide: VOUCHER_REPOSITORY, useValue: mockRepo },
        { provide: PrometheusService, useValue: mockPrometheus },
        { provide: DistributedLockService, useValue: mockLockService },
      ],
    }).compile();

    worker = module.get<VoucherCleanupWorker>(VoucherCleanupWorker);
    repo = module.get(VOUCHER_REPOSITORY);
  });

  it('should call deleteOldObsoleteCandidates with 90 days on cleanup', async () => {
    repo.deleteOldObsoleteCandidates.mockResolvedValue(5);
    
    await worker.handleCleanup();

    expect(repo.deleteOldObsoleteCandidates).toHaveBeenCalledWith(90);
  });

  it('should skip if shutting down', async () => {
    await worker.onModuleDestroy();
    await worker.handleCleanup();
    expect(mockLockService.acquireLock).not.toHaveBeenCalled();
  });

  it('should skip if lock not acquired', async () => {
    mockLockService.acquireLock.mockResolvedValue(false);
    await worker.handleCleanup();
    expect(mockPrometheus.cronLockContentionTotal.inc).toHaveBeenCalled();
    expect(repo.deleteOldObsoleteCandidates).not.toHaveBeenCalled();
  });

  it('should track failure if error occurs', async () => {
    repo.deleteOldObsoleteCandidates.mockRejectedValue(new Error('DB error'));
    await worker.handleCleanup();
    expect(mockPrometheus.cronLockFailedTotal.inc).toHaveBeenCalled();
    expect(mockLockService.releaseLock).toHaveBeenCalled();
  });
});
