import { Test, TestingModule } from '@nestjs/testing';
import { ERPSyncWorker } from './erp-sync.worker';
import { ProcessERPSyncUseCase } from '../use-cases/process-erp-sync.use-case';
import { LoggerService } from '../../../core/logger/logger.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { OpenTelemetryTracer } from '../../../shared/observability/tracing/opentelemetry.tracer';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { Job } from 'bullmq';

jest.mock('@opentelemetry/api', () => ({
  context: {
    active: jest.fn(),
    with: jest.fn((ctx, fn) => fn()),
  },
  propagation: {
    extract: jest.fn(),
  },
}));

describe('ERPSyncWorker', () => {
  let worker: ERPSyncWorker;

  const mockLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const mockUseCase = {
    createJob: jest.fn(),
    execute: jest.fn(),
  };
  const mockPrometheus = {
    erpSyncSeconds: { startTimer: jest.fn(() => jest.fn()) },
  };
  const mockTracer = {
    startActiveSpan: jest.fn(async (name, fn) => fn({ end: jest.fn() })),
  };
  const mockPrisma = {
    eRPSyncJob: { findUnique: jest.fn() },
  };
  const mockPeriodService = {
    validatePostingAllowed: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ERPSyncWorker,
        { provide: LoggerService, useValue: mockLogger },
        { provide: ProcessERPSyncUseCase, useValue: mockUseCase },
        { provide: PrometheusService, useValue: mockPrometheus },
        { provide: OpenTelemetryTracer, useValue: mockTracer },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountingPeriodService, useValue: mockPeriodService },
      ],
    }).compile();

    worker = module.get<ERPSyncWorker>(ERPSyncWorker);
  });

  afterEach(async () => {
    await worker.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  describe('process', () => {
    it('should create job if jobId is missing but voucherCandidateId is provided', async () => {
      const mockJob = { data: { voucherCandidateId: 'v-1' }, attemptsMade: 1 } as Job;
      mockUseCase.createJob.mockResolvedValue({ id: 'new-job-id' });
      mockPrisma.eRPSyncJob.findUnique.mockResolvedValue(null);
      mockUseCase.execute.mockResolvedValue(undefined);

      const result = await worker.process(mockJob);

      expect(mockUseCase.createJob).toHaveBeenCalledWith('v-1');
      expect(mockUseCase.execute).toHaveBeenCalledWith('new-job-id', 1);
      expect(result).toEqual({ success: true });
    });

    it('should execute existing job if jobId is provided', async () => {
      const mockJob = { data: { jobId: 'job-1' }, attemptsMade: 2 } as Job;
      mockPrisma.eRPSyncJob.findUnique.mockResolvedValue(null);
      mockUseCase.execute.mockResolvedValue(undefined);

      const result = await worker.process(mockJob);

      expect(mockUseCase.createJob).not.toHaveBeenCalled();
      expect(mockUseCase.execute).toHaveBeenCalledWith('job-1', 2);
      expect(result).toEqual({ success: true });
    });

    it('should validate accounting period if candidate is attached', async () => {
      const mockJob = { data: { jobId: 'job-1' }, attemptsMade: 1 } as Job;
      mockPrisma.eRPSyncJob.findUnique.mockResolvedValue({
        id: 'job-1',
        voucherCandidate: { companyId: 'comp-1', date: new Date('2026-08-01') },
      });
      mockPeriodService.validatePostingAllowed.mockResolvedValue(undefined);
      mockUseCase.execute.mockResolvedValue(undefined);

      await worker.process(mockJob);

      expect(mockPeriodService.validatePostingAllowed).toHaveBeenCalledWith('comp-1', expect.any(Date));
    });

    it('should propagate error to BullMQ for retry if execution fails', async () => {
      const mockJob = { data: { jobId: 'job-1' }, attemptsMade: 1 } as Job;
      mockPrisma.eRPSyncJob.findUnique.mockResolvedValue(null);
      mockUseCase.execute.mockRejectedValue(new Error('Sync failed'));

      await expect(worker.process(mockJob)).rejects.toThrow('Sync failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
