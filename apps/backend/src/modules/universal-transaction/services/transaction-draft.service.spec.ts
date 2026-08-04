import { Test, TestingModule } from '@nestjs/testing';
import { TransactionDraftService } from './transaction-draft.service';
import { TransactionDraftRepository } from '../repositories/transaction-draft.repository';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { AccountingPolicyService } from '../../accounting-policy/services/accounting-policy.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { DuplicateDetectionService } from '../../duplicate-detection/services/duplicate-detection.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DuplicateRecommendedAction } from '@prisma/client';
import { DuplicateDetectedException } from '../../duplicate-detection/exceptions/duplicate-detection.exceptions';

const makePayload = (overrides: any = {}): any => ({
  header: {
    companyId: 'comp-1',
    tenantId: 'tenant-1',
    invoiceNumber: 'INV-001',
    invoiceDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
  },
  parties: { vendorId: 'v-1' },
  ledgerEntries: [
    { ledgerName: 'Vendor A', amount: 100, isDebit: false },
    { ledgerName: 'Office Expenses', amount: 100, isDebit: true },
  ],
  metadata: { auditVersion: 1 },
  ...overrides,
});

describe('TransactionDraftService', () => {
  let service: TransactionDraftService;
  let repository: any;
  let outboxRepository: any;
  let policyEngine: any;
  let periodService: any;
  let duplicateDetectionService: any;
  let prisma: any;
  let prometheusService: any;

  beforeEach(async () => {
    repository = {
      createDraft: jest.fn(),
      updateDraftWithOptimisticLocking: jest.fn(),
    };
    outboxRepository = {
      createEvent: jest.fn(),
    };
    policyEngine = {
      validateDraft: jest.fn().mockResolvedValue({ valid: true, normalizedPayload: null }),
      applyCompanyRules: jest.fn().mockResolvedValue({ valid: true, normalizedPayload: null }),
    };
    periodService = {
      validatePostingAllowed: jest.fn().mockResolvedValue(undefined),
    };
    duplicateDetectionService = {
      evaluate: jest.fn().mockResolvedValue({
        decision: { recommendedAction: DuplicateRecommendedAction.ALLOW, decisionReason: '' },
        fingerprint: {},
      }),
      persistFingerprint: jest.fn(),
    };
    prisma = {
      $transaction: jest.fn().mockImplementation((fn: any) => fn(prisma)),
      transactionDraft: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    prometheusService = {
      draftFailedTotal: { inc: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionDraftService,
        { provide: TransactionDraftRepository, useValue: repository },
        { provide: TransactionOutboxRepository, useValue: outboxRepository },
        { provide: AccountingPolicyService, useValue: policyEngine },
        { provide: AccountingPeriodService, useValue: periodService },
        { provide: DuplicateDetectionService, useValue: duplicateDetectionService },
        { provide: PrismaService, useValue: prisma },
        { provide: PrometheusService, useValue: prometheusService },
      ],
    }).compile();

    service = module.get<TransactionDraftService>(TransactionDraftService);
  });

  describe('createDraft', () => {
    it('should create draft successfully', async () => {
      const mockDraft = { id: 'd-1' };
      repository.createDraft.mockResolvedValue(mockDraft);
      const result = await service.createDraft(makePayload(), 'user-1');
      expect(result).toEqual(mockDraft);
      expect(duplicateDetectionService.evaluate).toHaveBeenCalled();
    });

    it('should block on AUTO_BLOCK duplicate', async () => {
      duplicateDetectionService.evaluate.mockResolvedValue({
        decision: { recommendedAction: DuplicateRecommendedAction.AUTO_BLOCK, decisionReason: 'Exact duplicate' },
        fingerprint: {},
      });
      await expect(service.createDraft(makePayload(), 'user-1')).rejects.toThrow(DuplicateDetectedException);
    });

    it('should inject validation errors into metadata on invalid policy validation', async () => {
      policyEngine.validateDraft.mockResolvedValue({ valid: false, errors: [{ message: 'Amount mismatch' }], warnings: [], normalizedPayload: {} });
      const mockDraft = { id: 'd-1', payload: { metadata: { validationErrors: ['Amount mismatch'] } } };
      repository.createDraft.mockResolvedValue(mockDraft);
      const result = await service.createDraft(makePayload(), 'user-1');
      expect(result).toEqual(mockDraft);
    });

    it('should inject warning on ALLOW_WITH_WARNING', async () => {
      duplicateDetectionService.evaluate.mockResolvedValue({
        decision: {
          recommendedAction: DuplicateRecommendedAction.ALLOW_WITH_WARNING,
          decisionReason: 'Possible duplicate',
        },
        fingerprint: {},
      });
      const mockDraft = { id: 'd-1' };
      repository.createDraft.mockResolvedValue(mockDraft);
      await service.createDraft(makePayload(), 'user-1');
      const calledPayload = repository.createDraft.mock.calls[0][0];
      expect(calledPayload.metadata.warnings[0]).toContain('Possible duplicate');
    });
  });

  describe('getDraft', () => {
    it('should return draft if found and tenant matches', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1' });
      const result = await service.getDraft('d-1', 'tenant-1');
      expect(result.id).toBe('d-1');
    });

    it('should throw NotFoundException if draft not found', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue(null);
      await expect(service.getDraft('d-1', 'tenant-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if tenant mismatch', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'other-tenant' });
      await expect(service.getDraft('d-1', 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDraft', () => {
    it('should update draft after policy check', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1', status: 'DRAFT', payload: makePayload() });
      repository.updateDraftWithOptimisticLocking.mockResolvedValue({ id: 'd-1' });
      const dto: any = { currentVersion: 1, payload: makePayload() };
      const result = await service.updateDraft('d-1', 'user-1', 'tenant-1', dto);
      expect(result!.id).toBe('d-1');
    });
  });

  describe('approveDraft', () => {
    it('should approve a DRAFT status draft', async () => {
      const draftPayload = makePayload();
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1', status: 'DRAFT', payload: draftPayload });
      repository.updateDraftWithOptimisticLocking.mockResolvedValue({ id: 'd-1' });
      const dto: any = { currentVersion: 1, reason: 'Looks good' };
      await service.approveDraft('d-1', 'user-1', 'tenant-1', dto);
      expect(outboxRepository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'DRAFT_APPROVED' }),
        expect.anything(),
      );
    });

    it('should throw BadRequestException if status is not approvable', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1', status: 'SYNCED', payload: makePayload() });
      await expect(service.approveDraft('d-1', 'user-1', 'tenant-1', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if validation fails', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1', status: 'DRAFT', payload: makePayload() });
      policyEngine.validateDraft.mockResolvedValue({ valid: false, errors: ['Unbalanced'] });
      await expect(service.approveDraft('d-1', 'user-1', 'tenant-1', { currentVersion: 1 } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectDraft', () => {
    it('should reject a PENDING_APPROVAL draft', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1', status: 'PENDING_APPROVAL', payload: makePayload() });
      repository.updateDraftWithOptimisticLocking.mockResolvedValue({ id: 'd-1' });
      await service.rejectDraft('d-1', 'user-1', 'tenant-1', { currentVersion: 1 } as any);
      expect(repository.updateDraftWithOptimisticLocking).toHaveBeenCalledWith(
        'd-1', 1, 'user-1', expect.anything(), 'REJECTED', expect.any(String),
      );
    });

    it('should throw if not PENDING_APPROVAL', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1', status: 'DRAFT', payload: makePayload() });
      await expect(service.rejectDraft('d-1', 'user-1', 'tenant-1', { currentVersion: 1 } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should call prisma update with new status', async () => {
      prisma.transactionDraft.update.mockResolvedValue({});
      await service.updateStatus('d-1', 'QUEUED' as any);
      expect(prisma.transactionDraft.update).toHaveBeenCalledWith({ where: { id: 'd-1' }, data: { status: 'QUEUED' } });
    });
  });

  describe('markFailed', () => {
    it('should mark draft as FAILED', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', payload: makePayload() });
      prisma.transactionDraft.update.mockResolvedValue({});
      await service.markFailed('d-1', 'ERP timeout');
      expect(prometheusService.draftFailedTotal.inc).toHaveBeenCalled();
      expect(prisma.transactionDraft.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
      );
    });

    it('should be a no-op if draft not found', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue(null);
      await expect(service.markFailed('d-x', 'reason')).resolves.not.toThrow();
    });
  });

  describe('retryFailedDraft', () => {
    it('should retry a FAILED draft', async () => {
      const payload = makePayload();
      payload.metadata.errors = ['old error'];
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1', status: 'FAILED', payload });
      prisma.transactionDraft.update.mockResolvedValue({ id: 'd-1' });
      await service.retryFailedDraft('d-1', 'user-1', 'tenant-1');
      expect(outboxRepository.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'DRAFT_APPROVED' }),
        expect.anything(),
      );
    });

    it('should throw if status is not FAILED', async () => {
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd-1', tenantId: 'tenant-1', status: 'DRAFT', payload: makePayload() });
      await expect(service.retryFailedDraft('d-1', 'user-1', 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });
});
