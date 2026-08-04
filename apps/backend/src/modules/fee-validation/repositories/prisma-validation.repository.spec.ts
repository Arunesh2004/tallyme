import { Test, TestingModule } from '@nestjs/testing';
import { PrismaFeeValidationRepository } from './prisma-validation.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('PrismaFeeValidationRepository', () => {
  let repository: PrismaFeeValidationRepository;

  const mockTx = {
    feeAllocationCandidate: { create: jest.fn() },
    feeValidation: { create: jest.fn() },
    feeValidationLog: { create: jest.fn() },
    feeValidationException: { createMany: jest.fn() },
    outstandingFee: { update: jest.fn() },
  };

  const mockPrisma = {
    feeAllocationCandidate: { create: jest.fn(), findUnique: jest.fn() },
    studentPaymentCandidate: { findUnique: jest.fn() },
    outstandingFee: { findMany: jest.fn() },
    feeValidationLog: { create: jest.fn() },
    feeValidationException: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx)),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaFeeValidationRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<PrismaFeeValidationRepository>(
      PrismaFeeValidationRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('saveCandidate', () => {
    it('should create a fee allocation candidate', async () => {
      const data = { studentPaymentCandidateId: 'spc-1', validationStatus: 'VALIDATED' };
      const created = { id: 'fac-1', ...data };
      mockPrisma.feeAllocationCandidate.create.mockResolvedValue(created);

      const result = await repository.saveCandidate(data);

      expect(result).toEqual(created);
      expect(mockPrisma.feeAllocationCandidate.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('findCandidateById', () => {
    it('should find a fee allocation candidate by id', async () => {
      const candidate = { id: 'fac-1', validationStatus: 'VALIDATED' };
      mockPrisma.feeAllocationCandidate.findUnique.mockResolvedValue(candidate);

      const result = await repository.findCandidateById('fac-1');

      expect(result).toEqual(candidate);
      expect(mockPrisma.feeAllocationCandidate.findUnique).toHaveBeenCalledWith({
        where: { id: 'fac-1' },
      });
    });

    it('should return null when candidate not found', async () => {
      mockPrisma.feeAllocationCandidate.findUnique.mockResolvedValue(null);

      const result = await repository.findCandidateById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findStudentPaymentCandidateById', () => {
    it('should find a student payment candidate by id', async () => {
      const spc = { id: 'spc-1', amount: 1500 };
      mockPrisma.studentPaymentCandidate.findUnique.mockResolvedValue(spc);

      const result = await repository.findStudentPaymentCandidateById('spc-1');

      expect(result).toEqual(spc);
    });
  });

  describe('getStudentOutstandings', () => {
    it('should return all outstanding fees for a student', async () => {
      const fees = [{ id: 'fee-1', studentId: 'std-1', amount: 5000 }];
      mockPrisma.outstandingFee.findMany.mockResolvedValue(fees);

      const result = await repository.getStudentOutstandings('std-1');

      expect(result).toEqual(fees);
      expect(mockPrisma.outstandingFee.findMany).toHaveBeenCalledWith({
        where: { studentId: 'std-1' },
      });
    });
  });

  describe('logValidation', () => {
    it('should create a fee validation log', async () => {
      const log = { level: 'INFO', message: 'Validated', feeValidationId: 'fv-1' };
      mockPrisma.feeValidationLog.create.mockResolvedValue(undefined);

      await repository.logValidation(log);

      expect(mockPrisma.feeValidationLog.create).toHaveBeenCalledWith({ data: log });
    });
  });

  describe('saveException', () => {
    it('should create a fee validation exception', async () => {
      const exception = { type: 'OVERPAYMENT', details: 'Amount exceeds outstanding' };
      mockPrisma.feeValidationException.create.mockResolvedValue(undefined);

      await repository.saveException(exception);

      expect(mockPrisma.feeValidationException.create).toHaveBeenCalledWith({
        data: exception,
      });
    });
  });

  describe('saveValidationResult', () => {
    beforeEach(() => {
      mockTx.feeAllocationCandidate.create.mockResolvedValue({ id: 'fac-new' });
      mockTx.feeValidation.create.mockResolvedValue({ id: 'fv-new' });
      mockTx.feeValidationLog.create.mockResolvedValue(undefined);
      mockTx.feeValidationException.createMany.mockResolvedValue({ count: 0 });
      mockTx.outstandingFee.update.mockResolvedValue(undefined);
    });

    it('should run a transaction and create candidate, validation log', async () => {
      const candidateData = {
        studentPaymentCandidateId: 'spc-1',
        validationStatus: 'VALIDATED',
        allocationBreakdown: [],
      };
      const logData = { level: 'INFO', message: 'OK', details: { executionTimeMs: 100 } };

      const result = await repository.saveValidationResult(candidateData, logData, []);

      expect(result).toEqual({ id: 'fac-new' });
      expect(mockTx.feeAllocationCandidate.create).toHaveBeenCalled();
      expect(mockTx.feeValidation.create).toHaveBeenCalled();
      expect(mockTx.feeValidationLog.create).toHaveBeenCalled();
    });

    it('should create exceptions when provided', async () => {
      const candidateData = {
        studentPaymentCandidateId: 'spc-1',
        validationStatus: 'VALIDATED',
        allocationBreakdown: [],
      };
      const exceptions = [{ type: 'PARTIAL_PAYMENT', amount: 500 }];

      await repository.saveValidationResult(candidateData, null, exceptions);

      expect(mockTx.feeValidationException.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ feeAllocationCandidateId: 'fac-new' })],
      });
    });

    it('should skip validation log when logData is null', async () => {
      const candidateData = {
        studentPaymentCandidateId: 'spc-1',
        validationStatus: 'VALIDATED',
        allocationBreakdown: [],
      };

      await repository.saveValidationResult(candidateData, null, []);

      expect(mockTx.feeValidation.create).not.toHaveBeenCalled();
      expect(mockTx.feeValidationLog.create).not.toHaveBeenCalled();
    });

    it('should update outstanding fees when allocations exist and status is valid', async () => {
      const candidateData = {
        studentPaymentCandidateId: 'spc-1',
        validationStatus: 'VALIDATED',
        allocationBreakdown: [
          { outstandingFeeId: 'fee-1', newAmountPaid: 1500, isPaid: true },
        ],
      };

      await repository.saveValidationResult(candidateData, null, []);

      expect(mockTx.outstandingFee.update).toHaveBeenCalledWith({
        where: { id: 'fee-1' },
        data: { amountPaid: 1500, isPaid: true },
      });
    });

    it('should NOT update outstanding fees when status is INVALID', async () => {
      const candidateData = {
        studentPaymentCandidateId: 'spc-1',
        validationStatus: 'INVALID',
        allocationBreakdown: [
          { outstandingFeeId: 'fee-1', newAmountPaid: 1500, isPaid: false },
        ],
      };

      await repository.saveValidationResult(candidateData, null, []);

      expect(mockTx.outstandingFee.update).not.toHaveBeenCalled();
    });

    it('should NOT update outstanding fees when status is DUPLICATE_PAYMENT', async () => {
      const candidateData = {
        studentPaymentCandidateId: 'spc-1',
        validationStatus: 'DUPLICATE_PAYMENT',
        allocationBreakdown: [{ outstandingFeeId: 'fee-1', newAmountPaid: 500, isPaid: false }],
      };

      await repository.saveValidationResult(candidateData, null, []);

      expect(mockTx.outstandingFee.update).not.toHaveBeenCalled();
    });

    it('should skip allocations without outstandingFeeId', async () => {
      const candidateData = {
        studentPaymentCandidateId: 'spc-1',
        validationStatus: 'VALIDATED',
        allocationBreakdown: [
          { outstandingFeeId: null, newAmountPaid: 500, isPaid: false },
        ],
      };

      await repository.saveValidationResult(candidateData, null, []);

      expect(mockTx.outstandingFee.update).not.toHaveBeenCalled();
    });
  });
});
