import { Test, TestingModule } from '@nestjs/testing';
import { PrismaERPRepository } from './prisma-erp.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('PrismaERPRepository', () => {
  let repository: PrismaERPRepository;

  const mockPrisma = {
    eRPSyncJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    eRPSyncAttempt: {
      create: jest.fn(),
    },
    eRPSyncHistory: {
      create: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaERPRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaERPRepository>(PrismaERPRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createSyncJob', () => {
    it('should create an ERP sync job with correct data', async () => {
      const jobData = {
        voucherCandidateId: 'vc-1',
        status: 'PENDING',
        adapterCode: 'TALLY',
        idempotencyHash: 'hash-abc',
      };
      mockPrisma.eRPSyncJob.create.mockResolvedValue({ id: 'job-1', ...jobData });

      const result = await repository.createSyncJob(jobData);

      expect(result).toMatchObject({ id: 'job-1' });
      expect(mockPrisma.eRPSyncJob.create).toHaveBeenCalledWith({
        data: {
          voucherCandidateId: jobData.voucherCandidateId,
          status: jobData.status,
          adapterCode: jobData.adapterCode,
          idempotencyHash: jobData.idempotencyHash,
        },
      });
    });
  });

  describe('findConnectionByAdapter', () => {
    it('should return adapter identity with isActive: true', async () => {
      const result = await repository.findConnectionByAdapter('TALLY');

      expect(result).toEqual({ adapterCode: 'TALLY', isActive: true });
    });
  });

  describe('logAttempt', () => {
    it('should create an ERP sync attempt', async () => {
      const attempt = { jobId: 'job-1', status: 'FAILED', errorMessage: 'Connection refused' };
      mockPrisma.eRPSyncAttempt.create.mockResolvedValue(undefined);

      await repository.logAttempt(attempt);

      expect(mockPrisma.eRPSyncAttempt.create).toHaveBeenCalledWith({ data: attempt });
    });
  });

  describe('findJobById', () => {
    it('should find an ERP sync job by ID', async () => {
      const job = { id: 'job-1', status: 'PENDING' };
      mockPrisma.eRPSyncJob.findUnique.mockResolvedValue(job);

      const result = await repository.findJobById('job-1');

      expect(result).toEqual(job);
      expect(mockPrisma.eRPSyncJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-1' },
      });
    });

    it('should return null when job not found', async () => {
      mockPrisma.eRPSyncJob.findUnique.mockResolvedValue(null);

      const result = await repository.findJobById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateJobStatus', () => {
    beforeEach(() => {
      mockPrisma.eRPSyncJob.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.eRPSyncHistory.create.mockResolvedValue(undefined);
    });

    it('should update job status with no result metadata', async () => {
      await repository.updateJobStatus('job-1', 'SYNCED');

      expect(mockPrisma.eRPSyncJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: 'SYNCED', lastError: null, erpReferenceId: undefined },
      });
      expect(mockPrisma.eRPSyncHistory.create).toHaveBeenCalledWith({
        data: { jobId: 'job-1', statusFrom: null, statusTo: 'SYNCED', reason: null },
      });
    });

    it('should set increment attempt data when incrementAttempt is true', async () => {
      const result = {
        incrementAttempt: true,
        lastError: 'Tally timeout',
        statusFrom: 'PENDING',
      };

      await repository.updateJobStatus('job-1', 'FAILED', result);

      expect(mockPrisma.eRPSyncJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attempts: { increment: 1 },
            lastAttemptAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should set increment verification data when incrementVerification is true', async () => {
      const result = { incrementVerification: true };

      await repository.updateJobStatus('job-1', 'VERIFIED', result);

      expect(mockPrisma.eRPSyncJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationAttempts: { increment: 1 },
            lastVerificationAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should persist audit XML fields when provided', async () => {
      const result = {
        requestXml: '<request>xml</request>',
        responseXml: '<response>xml</response>',
        xmlHash: 'hash-123',
        responseTimeMs: 250,
        transportStatus: 'SUCCESS',
        voucherNumber: 'VCH-001',
      };

      await repository.updateJobStatus('job-1', 'SYNCED', result);

      expect(mockPrisma.eRPSyncJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestXml: '<request>xml</request>',
            responseXml: '<response>xml</response>',
            xmlHash: 'hash-123',
            responseTimeMs: 250,
            transportStatus: 'SUCCESS',
            voucherNumber: 'VCH-001',
          }),
        }),
      );
    });

    it('should throw ConcurrentMutationException when statusFrom race is detected', async () => {
      mockPrisma.eRPSyncJob.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.eRPSyncHistory.create.mockResolvedValue(undefined);

      const result = { statusFrom: 'PENDING' };

      await expect(repository.updateJobStatus('job-1', 'SYNCED', result)).rejects.toThrow(
        'Concurrent mutation race detected',
      );
    });

    it('should not throw when count is 0 but statusFrom is not provided', async () => {
      mockPrisma.eRPSyncJob.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.updateJobStatus('job-1', 'SYNCED')).resolves.not.toThrow();
    });

    it('should filter by statusFrom when provided', async () => {
      const result = { statusFrom: 'PENDING' };

      await repository.updateJobStatus('job-1', 'SYNCED', result);

      expect(mockPrisma.eRPSyncJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1', status: 'PENDING' },
        }),
      );
    });
  });

  describe('logSyncEvent', () => {
    it('should do nothing (no-op)', async () => {
      await expect(repository.logSyncEvent({ any: 'data' })).resolves.toBeUndefined();
    });
  });

  describe('findJobByIdempotencyHash', () => {
    it('should find a job by its idempotency hash', async () => {
      const job = { id: 'job-1', idempotencyHash: 'hash-abc' };
      mockPrisma.eRPSyncJob.findUnique.mockResolvedValue(job);

      const result = await repository.findJobByIdempotencyHash('hash-abc');

      expect(result).toEqual(job);
      expect(mockPrisma.eRPSyncJob.findUnique).toHaveBeenCalledWith({
        where: { idempotencyHash: 'hash-abc' },
      });
    });

    it('should return null when no job found for hash', async () => {
      mockPrisma.eRPSyncJob.findUnique.mockResolvedValue(null);

      const result = await repository.findJobByIdempotencyHash('unknown-hash');

      expect(result).toBeNull();
    });
  });

  describe('findStrandedSyncJobs', () => {
    it('should find jobs in SYNCING status older than specified minutes', async () => {
      const strandedJobs = [{ id: 'job-1', status: 'SYNCING' }];
      mockPrisma.eRPSyncJob.findMany.mockResolvedValue(strandedJobs);

      const result = await repository.findStrandedSyncJobs(30);

      expect(result).toEqual(strandedJobs);
      expect(mockPrisma.eRPSyncJob.findMany).toHaveBeenCalledWith({
        where: {
          status: 'SYNCING',
          lastAttemptAt: { lt: expect.any(Date) },
        },
        include: { voucherCandidate: true },
      });
    });

    it('should return empty array when no stranded jobs found', async () => {
      mockPrisma.eRPSyncJob.findMany.mockResolvedValue([]);

      const result = await repository.findStrandedSyncJobs(60);

      expect(result).toEqual([]);
    });
  });
});
