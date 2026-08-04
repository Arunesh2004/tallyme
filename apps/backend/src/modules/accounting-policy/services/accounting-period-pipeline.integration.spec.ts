import { Test, TestingModule } from '@nestjs/testing';
import { ProcessVoucherBuilderUseCase } from '../../voucher-builder/use-cases/process-voucher-builder.use-case';
import { ProcessERPSyncUseCase } from '../../erp-connector/use-cases/process-erp-sync.use-case';
import { AccountingPeriodService } from './accounting-period.service';
import { PeriodLockedException } from '../../../shared/exceptions/PeriodLockedException';
import { LoggerService } from '../../../core/logger/logger.service';

describe('Accounting Period Pipeline Integration', () => {
  let voucherBuilderUseCase: ProcessVoucherBuilderUseCase;
  let erpSyncUseCase: ProcessERPSyncUseCase;
  let periodService: any;
  let repository: any;
  let erpRepository: any;

  beforeEach(async () => {
    periodService = {
      validatePostingAllowed: jest.fn(),
    };

    repository = {
      saveVoucherResult: jest.fn(),
      checkCompanyExists: jest.fn().mockResolvedValue(true)
    };

    erpRepository = {
      findJobById: jest.fn().mockResolvedValue({ id: 'job-1', status: 'PENDING', voucherCandidateId: 'vc-1' }),
      updateJobStatus: jest.fn(),
      logAttempt: jest.fn(),
    };

    const mockPrismaService = {
      voucherCandidate: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vc-1', companyId: 'c1', date: new Date(), entries: [] }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      batchSyncItem: {
        findMany: jest.fn().mockResolvedValue([]),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ProcessVoucherBuilderUseCase, useValue: new ProcessVoucherBuilderUseCase(repository, {} as any, {} as any, { debug: jest.fn(), warn: jest.fn(), log: jest.fn(), error: jest.fn() } as any, mockPrismaService as any, periodService) },
        { provide: ProcessERPSyncUseCase, useValue: new ProcessERPSyncUseCase(erpRepository, { findById: jest.fn().mockResolvedValue({ id: 'vc-1', date: new Date(), companyId: 'c1', entries: [] }) } as any, {} as any, {} as any, { debug: jest.fn(), warn: jest.fn(), log: jest.fn(), error: jest.fn() } as any, mockPrismaService as any, { validate: jest.fn().mockResolvedValue({ valid: true }) } as any, {} as any, {} as any, {} as any, {} as any, {} as any, { shouldRetry: jest.fn().mockReturnValue(false), isExhausted: jest.fn().mockReturnValue(true), getMaxAttempts: jest.fn().mockReturnValue(3) } as any, periodService) }
      ],
    }).compile();

    voucherBuilderUseCase = module.get<ProcessVoucherBuilderUseCase>(ProcessVoucherBuilderUseCase);
    erpSyncUseCase = module.get<ProcessERPSyncUseCase>(ProcessERPSyncUseCase);
  });

  it('Voucher generation blocked after period lock', async () => {
    periodService.validatePostingAllowed.mockRejectedValue(new PeriodLockedException('Period is locked', 'pid'));
    
    await voucherBuilderUseCase.execute({ companyId: 'c1', candidateId: 'draft-1' });
    
    expect(repository.saveVoucherResult).toHaveBeenCalledWith(
      expect.objectContaining({
        validationStatus: 'MANUAL_REVIEW',
        voucherNumber: 'BLOCKED'
      }),
      expect.any(Object)
    );
  });

  it('ERP sync blocked after period closure', async () => {
    periodService.validatePostingAllowed.mockRejectedValue(new PeriodLockedException('Period is closed', 'pid'));

    await erpSyncUseCase.execute('job-1', 1);

    expect(erpRepository.updateJobStatus).toHaveBeenCalledWith(
      'job-1',
      'FAILED_PERMANENT',
      expect.objectContaining({ reason: expect.stringContaining('ERP Sync blocked:') })
    );
  });
});
