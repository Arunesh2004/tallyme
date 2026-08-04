import { Test, TestingModule } from '@nestjs/testing';
import { ERPVerifyWorker } from './erp-verify.worker';
import { VerifyERPSyncUseCase } from '../use-cases/verify-erp-sync.use-case';
import { LoggerService } from '../../../core/logger/logger.service';
import { Job } from 'bullmq';

describe('ERPVerifyWorker', () => {
  let worker: ERPVerifyWorker;

  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const mockUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ERPVerifyWorker,
        { provide: LoggerService, useValue: mockLogger },
        { provide: VerifyERPSyncUseCase, useValue: mockUseCase },
      ],
    }).compile();

    worker = module.get<ERPVerifyWorker>(ERPVerifyWorker);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  describe('process', () => {
    it('should process verification successfully', async () => {
      const mockJob = { data: { jobId: 'job-1' }, attemptsMade: 2 } as Job;
      mockUseCase.execute.mockResolvedValue(undefined);

      const result = await worker.process(mockJob);

      expect(mockUseCase.execute).toHaveBeenCalledWith('job-1', 2);
      expect(result).toEqual({ success: true });
    });

    it('should propagate error to BullMQ for retry if execution fails', async () => {
      const mockJob = { data: { jobId: 'job-1' }, attemptsMade: 1 } as Job;
      mockUseCase.execute.mockRejectedValue(new Error('Verification failed'));

      await expect(worker.process(mockJob)).rejects.toThrow('Verification failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
