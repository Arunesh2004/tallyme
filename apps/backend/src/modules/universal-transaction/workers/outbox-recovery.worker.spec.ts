import { Test, TestingModule } from '@nestjs/testing';
import { OutboxRecoverySweeper } from './outbox-recovery.worker';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { DistributedLockService } from '../../../shared/redis/distributed-lock.service';

describe('OutboxRecoverySweeper', () => {
  let sweeper: OutboxRecoverySweeper;

  const mockOutboxRepo = {
    rescueStrandedEvents: jest.fn(),
  };

  const mockPrometheus = {
    cronLockContentionTotal: { inc: jest.fn() },
    cronLockAcquiredTotal: { inc: jest.fn() },
    cronLockFailedTotal: { inc: jest.fn() },
  };

  const mockLockService = {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxRecoverySweeper,
        { provide: TransactionOutboxRepository, useValue: mockOutboxRepo },
        { provide: PrometheusService, useValue: mockPrometheus },
        { provide: DistributedLockService, useValue: mockLockService },
      ],
    }).compile();

    sweeper = module.get<OutboxRecoverySweeper>(OutboxRecoverySweeper);
  });

  afterEach(() => {
    sweeper.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(sweeper).toBeDefined();
  });

  it('should run sweeper successfully if lock is acquired', async () => {
    mockLockService.acquireLock.mockResolvedValue(true);
    mockOutboxRepo.rescueStrandedEvents.mockResolvedValue(5);

    await sweeper.rescueEvents();

    expect(mockLockService.acquireLock).toHaveBeenCalled();
    expect(mockPrometheus.cronLockAcquiredTotal.inc).toHaveBeenCalledWith({ job: 'outbox_recovery_sweep' });
    expect(mockOutboxRepo.rescueStrandedEvents).toHaveBeenCalledWith(5);
    expect(mockLockService.releaseLock).toHaveBeenCalled();
  });

  it('should skip sweeper if lock is not acquired', async () => {
    mockLockService.acquireLock.mockResolvedValue(false);

    await sweeper.rescueEvents();

    expect(mockLockService.acquireLock).toHaveBeenCalled();
    expect(mockPrometheus.cronLockContentionTotal.inc).toHaveBeenCalledWith({ job: 'outbox_recovery_sweep' });
    expect(mockOutboxRepo.rescueStrandedEvents).not.toHaveBeenCalled();
    expect(mockLockService.releaseLock).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully and release lock', async () => {
    mockLockService.acquireLock.mockResolvedValue(true);
    mockOutboxRepo.rescueStrandedEvents.mockRejectedValue(new Error('Test Error'));

    await sweeper.rescueEvents();

    expect(mockPrometheus.cronLockFailedTotal.inc).toHaveBeenCalledWith({ job: 'outbox_recovery_sweep' });
    expect(mockLockService.releaseLock).toHaveBeenCalled();
  });

  it('should not run if shutting down', async () => {
    sweeper.onModuleDestroy();
    
    await sweeper.rescueEvents();
    
    expect(mockLockService.acquireLock).not.toHaveBeenCalled();
  });
});
