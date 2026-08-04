import { Test, TestingModule } from '@nestjs/testing';
import { ProcessVoucherBuilderUseCase } from './process-voucher-builder.use-case';
import { VOUCHER_REPOSITORY, VOUCHER_STATUS, TALLY_SYNC_QUEUE } from '../constants/voucher.constants';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { VoucherBuilderEngine } from '../services/voucher-builder.engine';
import { LoggerService } from '../../../core/logger/logger.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { PeriodLockedException } from '../../../shared/exceptions/PeriodLockedException';

describe('ProcessVoucherBuilderUseCase', () => {
  let useCase: ProcessVoucherBuilderUseCase;

  const mockRepo = {
    checkCompanyExists: jest.fn().mockResolvedValue(true),
    findFeeAllocationCandidateById: jest.fn(),
    saveVoucherResult: jest.fn().mockResolvedValue({ id: 'vc-1' }),
  };

  const mockBuilderEngine = {
    build: jest.fn(),
  };

  const mockQueue = {
    addJob: jest.fn(),
  };

  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  };

  const mockPrisma = {
    voucherCandidate: {
      findFirst: jest.fn(),
    },
    transactionOutbox: {
      create: jest.fn(),
    },
  };

  const mockPeriodService = {
    validatePostingAllowed: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessVoucherBuilderUseCase,
        { provide: VOUCHER_REPOSITORY, useValue: mockRepo },
        { provide: VoucherBuilderEngine, useValue: mockBuilderEngine },
        { provide: QUEUE_PROVIDER, useValue: mockQueue },
        { provide: LoggerService, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountingPeriodService, useValue: mockPeriodService },
      ],
    }).compile();

    useCase = module.get<ProcessVoucherBuilderUseCase>(ProcessVoucherBuilderUseCase);
  });

  describe('execute', () => {
    it('1. Normal voucher creation: OPEN period -> VoucherCandidate created', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue(null);
      mockPeriodService.validatePostingAllowed.mockResolvedValue(undefined);
      mockBuilderEngine.build.mockResolvedValue({
        voucherType: 'RECEIPT',
        voucherNumber: '123',
        status: VOUCHER_STATUS.VALIDATED,
        totalDebit: 100,
        totalCredit: 100,
        warnings: [],
        lines: [],
        references: [],
        narrations: [],
      });

      await useCase.execute({ candidateId: 'draft-1', companyId: 'c1' });

      expect(mockPeriodService.validatePostingAllowed).toHaveBeenCalled();
      expect(mockBuilderEngine.build).toHaveBeenCalled();
      expect(mockRepo.saveVoucherResult).toHaveBeenCalledWith(
        expect.objectContaining({ validationStatus: VOUCHER_STATUS.VALIDATED }),
        expect.any(Object),
      );
      expect(mockQueue.addJob).toHaveBeenCalledWith(TALLY_SYNC_QUEUE, 'sync-tally', expect.any(Object));
    });

    it('2. Locked period: No voucher generation, Status: MANUAL_REVIEW', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue(null);
      mockPeriodService.validatePostingAllowed.mockRejectedValue(new PeriodLockedException('Locked', 'p1'));

      await useCase.execute({ candidateId: 'draft-1', companyId: 'c1' });

      expect(mockBuilderEngine.build).not.toHaveBeenCalled();
      expect(mockRepo.saveVoucherResult).toHaveBeenCalledWith(
        expect.objectContaining({ validationStatus: VOUCHER_STATUS.MANUAL_REVIEW, manualReviewRequired: true }),
        expect.any(Object)
      );
    });

    it('3. Closed period: Rejected safely', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue(null);
      mockPeriodService.validatePostingAllowed.mockRejectedValue(new PeriodLockedException('Closed', 'p1'));

      await useCase.execute({ candidateId: 'draft-1', companyId: 'c1' });

      expect(mockBuilderEngine.build).not.toHaveBeenCalled();
      expect(mockRepo.saveVoucherResult).toHaveBeenCalledWith(
        expect.objectContaining({ validationStatus: VOUCHER_STATUS.MANUAL_REVIEW, manualReviewRequired: true }),
        expect.any(Object)
      );
    });

    it('4. Idempotency: Same transaction processed twice -> Single voucher result', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue({ id: 'vc-exists' });

      await useCase.execute({ candidateId: 'draft-1', companyId: 'c1' });

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Idempotency Hit'), expect.any(String));
      expect(mockPeriodService.validatePostingAllowed).not.toHaveBeenCalled();
      expect(mockBuilderEngine.build).not.toHaveBeenCalled();
    });

    it('5. Builder failure: Safe recovery', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue(null);
      mockPeriodService.validatePostingAllowed.mockResolvedValue(undefined);
      mockBuilderEngine.build.mockRejectedValue(new Error('Builder exploded'));

      await expect(useCase.execute({ candidateId: 'draft-1', companyId: 'c1' })).rejects.toThrow('Builder exploded');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw error if company not found', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue(null);
      mockRepo.checkCompanyExists.mockResolvedValue(false);
      await expect(useCase.execute({ candidateId: 'draft-1', companyId: 'c1' })).rejects.toThrow('Company c1 not found');
      mockRepo.checkCompanyExists.mockResolvedValue(true); // reset
    });

    it('should adapt old payload from fee allocation candidate', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue(null);
      mockRepo.findFeeAllocationCandidateById.mockResolvedValue({
        studentPaymentCandidate: {
          amount: 500,
          paymentGateway: 'RAZORPAY',
          paymentCandidateId: 'pay123',
          studentId: 's1',
          admissionNumber: 'ADM001'
        }
      });
      mockPeriodService.validatePostingAllowed.mockResolvedValue(undefined);
      mockBuilderEngine.build.mockResolvedValue({
        voucherType: 'RECEIPT',
        voucherNumber: '123',
        status: VOUCHER_STATUS.VALIDATED,
        totalDebit: 500,
        totalCredit: 500,
        warnings: [],
        lines: [],
        references: [],
        narrations: [],
      });
      await useCase.execute({ feeAllocationCandidateId: 'fac-1', companyId: 'c1' });
      expect(mockBuilderEngine.build).toHaveBeenCalledWith(expect.objectContaining({
        voucherType: 'RECEIPT',
        candidateId: 'fac-1'
      }));
    });

    it('should throw if old payload candidate missing payment candidate', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue(null);
      mockRepo.findFeeAllocationCandidateById.mockResolvedValue({});
      await expect(useCase.execute({ feeAllocationCandidateId: 'fac-1', companyId: 'c1' }))
        .rejects.toThrow('Fee allocation candidate fac-1 not found or missing payment candidate');
    });

    it('should mark MANUAL_REVIEW for UNKNOWN_LEDGER, mismatch, or missing GST', async () => {
      mockPrisma.voucherCandidate.findFirst.mockResolvedValue(null);
      mockPeriodService.validatePostingAllowed.mockResolvedValue(undefined);
      mockBuilderEngine.build.mockResolvedValue({
        voucherType: 'RECEIPT',
        voucherNumber: '123',
        status: VOUCHER_STATUS.VALIDATED,
        totalDebit: 500,
        totalCredit: 400, // mismatch
        warnings: [],
        lines: [
          { ledgerId: '1', type: 'DEBIT', amount: 500 }, // missing ledgerName
          { ledgerId: '2', ledgerName: 'UNKNOWN_LEDGER', type: 'CREDIT', amount: 400 } // unknown
        ],
        references: [],
        narrations: [],
      });
      await useCase.execute({ candidateId: 'draft-1', companyId: 'c1', invoice: { tax: 10 } });
      expect(mockRepo.saveVoucherResult).toHaveBeenCalledWith(
        expect.objectContaining({ 
          validationStatus: VOUCHER_STATUS.MANUAL_REVIEW,
          manualReviewRequired: true
        }),
        expect.any(Object)
      );
    });
  });
});
