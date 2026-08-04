import { Test, TestingModule } from '@nestjs/testing';
import { ERPIdempotencyService } from './idempotency.service';
import { ERP_REPOSITORY } from '../constants/erp.constants';
import { LoggerService } from '../../../core/logger/logger.service';
import { ERPIdempotencyException } from '../exceptions/erp.exceptions';

describe('ERPIdempotencyService', () => {
  let service: ERPIdempotencyService;
  let repository: any;
  let logger: any;

  beforeEach(async () => {
    repository = {
      findJobByIdempotencyHash: jest.fn(),
      createSyncJob: jest.fn(),
    };
    logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ERPIdempotencyService,
        { provide: ERP_REPOSITORY, useValue: repository },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<ERPIdempotencyService>(ERPIdempotencyService);
  });

  describe('generateHash', () => {
    it('should generate deterministic hash', () => {
      const req = { companyId: 'COMP-1', voucherCandidateId: 'CAND-1', voucherNumber: 'V-100' };
      const hash1 = service.generateHash(req);
      const hash2 = service.generateHash(req);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it('should be case-insensitive for standardized fields', () => {
      const req1 = { companyId: 'COMP-1', voucherCandidateId: 'CAND-1', voucherNumber: 'v-100' };
      const req2 = { companyId: 'comp-1', voucherCandidateId: 'cand-1', voucherNumber: 'V-100' };
      expect(service.generateHash(req1)).toBe(service.generateHash(req2));
    });

    it('should throw if required fields are missing', () => {
      const req = { companyId: '', voucherCandidateId: 'CAND-1', voucherNumber: 'V-100' };
      expect(() => service.generateHash(req)).toThrow(ERPIdempotencyException);
    });
  });

  describe('isDuplicate', () => {
    it('should return false if no existing job', async () => {
      repository.findJobByIdempotencyHash.mockResolvedValue(null);
      const result = await service.isDuplicate('hash-1');
      expect(result.isDuplicate).toBe(false);
    });

    it('should return true with job details if job exists', async () => {
      repository.findJobByIdempotencyHash.mockResolvedValue({ id: 'j-1', status: 'COMPLETED' });
      const result = await service.isDuplicate('hash-1');
      expect(result.isDuplicate).toBe(true);
      expect(result.jobId).toBe('j-1');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('createJobIfAbsent', () => {
    it('should create job and return it', async () => {
      repository.createSyncJob.mockResolvedValue({ id: 'j-1' });
      const req = { companyId: 'c-1', voucherCandidateId: 'v-1', voucherNumber: 'V-100' };
      const result = await service.createJobIfAbsent({ status: 'PENDING' }, req);
      expect(result.id).toBe('j-1');
      expect(repository.createSyncJob).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', idempotencyHash: expect.any(String) }),
      );
    });

    it('should throw ERPIdempotencyException on P2002 unique constraint violation', async () => {
      const prismaError = new Error('Unique constraint failed');
      (prismaError as any).code = 'P2002';
      repository.createSyncJob.mockRejectedValue(prismaError);

      const req = { companyId: 'c-1', voucherCandidateId: 'v-1', voucherNumber: 'V-100' };
      await expect(service.createJobIfAbsent({}, req)).rejects.toThrow(ERPIdempotencyException);
    });

    it('should throw ERPIdempotencyException on general database error', async () => {
      repository.createSyncJob.mockRejectedValue(new Error('DB connection lost'));

      const req = { companyId: 'c-1', voucherCandidateId: 'v-1', voucherNumber: 'V-100' };
      await expect(service.createJobIfAbsent({}, req)).rejects.toThrow(ERPIdempotencyException);
    });
  });
});
