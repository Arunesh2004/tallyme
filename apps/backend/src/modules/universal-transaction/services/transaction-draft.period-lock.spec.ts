import { Test, TestingModule } from '@nestjs/testing';
import { TransactionDraftService } from './transaction-draft.service';
import { TransactionDraftRepository } from '../repositories/transaction-draft.repository';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { AccountingPolicyService } from '../../accounting-policy/services/accounting-policy.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { DuplicateDetectionService } from '../../duplicate-detection/services/duplicate-detection.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { PeriodLockedException } from '../../../shared/exceptions/PeriodLockedException';
import { TransactionStatus } from '@prisma/client';

describe('TransactionDraftService - Period Lock Integration', () => {
  let service: TransactionDraftService;
  let periodService: any;
  let policyService: any;
  let duplicateService: any;
  let repository: any;
  let outboxRepository: any;

  beforeEach(async () => {
    periodService = {
      validatePostingAllowed: jest.fn(),
    };
    
    policyService = {
      validateDraft: jest.fn().mockResolvedValue({ valid: true }),
      applyCompanyRules: jest.fn().mockResolvedValue({ normalizedPayload: {} }),
    };

    duplicateService = {
      evaluate: jest.fn().mockResolvedValue({ decision: { recommendedAction: 'ALLOW' }, fingerprint: 'test' }),
      persistFingerprint: jest.fn(),
    };

    repository = {
      createDraft: jest.fn().mockResolvedValue({ id: 'draft-1', status: TransactionStatus.DRAFT }),
      updateDraftWithOptimisticLocking: jest.fn().mockResolvedValue({ id: 'draft-1', status: TransactionStatus.APPROVED }),
    };

    outboxRepository = {
      createEvent: jest.fn(),
    };

    const mockPrismaService = {
      $transaction: jest.fn(cb => cb('mock-tx')),
      transactionDraft: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'draft-1',
          tenantId: 'tenant-1',
          status: TransactionStatus.PENDING_APPROVAL,
          payload: { header: { companyId: 'company-1', invoiceDate: new Date() }, metadata: {} }
        }),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionDraftService,
        { provide: TransactionDraftRepository, useValue: repository },
        { provide: TransactionOutboxRepository, useValue: outboxRepository },
        { provide: AccountingPolicyService, useValue: policyService },
        { provide: AccountingPeriodService, useValue: periodService },
        { provide: DuplicateDetectionService, useValue: duplicateService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PrometheusService, useValue: { draftFailedTotal: { inc: jest.fn() } } },
      ],
    }).compile();

    service = module.get<TransactionDraftService>(TransactionDraftService);
  });

  it('Open period -> approval -> PASS', async () => {
    periodService.validatePostingAllowed.mockResolvedValue();
    const result = await service.approveDraft('draft-1', 'user-1', 'tenant-1', { currentVersion: 1 } as any);
    expect(result!.id).toBe('draft-1');
  });

  it('Closed period -> approval rejected -> FAIL', async () => {
    periodService.validatePostingAllowed.mockRejectedValue(new PeriodLockedException('Period is closed', 'pid'));

    await expect(service.approveDraft('draft-1', 'user-1', 'tenant-1', { currentVersion: 1 } as any)).rejects.toThrow(PeriodLockedException);
  });
});
