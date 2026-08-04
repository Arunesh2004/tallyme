import { Test, TestingModule } from '@nestjs/testing';
import { TransactionDraftController } from './transaction-draft.controller';
import { TransactionDraftService } from '../services/transaction-draft.service';
import { DraftApprovalOrchestrator } from '../services/draft-approval.orchestrator';
import { VoucherReadinessEngine } from '../services/voucher-readiness.engine';
import { CompanyIntelligenceService } from '../../accounting-intelligence/company/company-intelligence.service';
import { ErpCapabilityService } from '../../accounting-intelligence/erp-capability/erp-capability.service';
import { HistoricalIntelligenceService } from '../../accounting-intelligence/historical/historical-intelligence.service';
import { AccountingPolicyService } from '../../accounting-policy/services/accounting-policy.service';
import { IdempotencyInterceptor } from '../../../infrastructure/api/middlewares/idempotency.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransactionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('TransactionDraftController', () => {
  let controller: TransactionDraftController;
  let service: TransactionDraftService;

  const mockService = {
    createDraft: jest.fn(),
    getDraft: jest.fn(),
    updateDraft: jest.fn(),
    rejectDraft: jest.fn(),
  };

  const mockOrchestrator = {
    approveDraft: jest.fn(),
  };

  const mockReadinessEngine = {
    evaluate: jest.fn(),
  };

  const mockCompanyIntelligenceService = {
    getProfile: jest.fn(),
  };

  const mockErpCapabilityService = {
    getProfile: jest.fn(),
  };

  const mockHistoricalIntelligenceService = {
    getSuggestions: jest.fn(),
  };

  const mockIdempotencyInterceptor = {
    intercept: jest.fn().mockImplementation((context: ExecutionContext, next: CallHandler) => {
      return next.handle();
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionDraftController],
      providers: [
        {
          provide: TransactionDraftService,
          useValue: mockService
        },
        {
          provide: DraftApprovalOrchestrator,
          useValue: mockOrchestrator
        },
        {
          provide: VoucherReadinessEngine,
          useValue: mockReadinessEngine
        },
        {
          provide: CompanyIntelligenceService,
          useValue: mockCompanyIntelligenceService
        },
        {
          provide: ErpCapabilityService,
          useValue: mockErpCapabilityService
        },
        {
          provide: HistoricalIntelligenceService,
          useValue: { getSuggestions: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: AccountingPolicyService,
          useValue: { applyCompanyRules: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [], normalizedPayload: {} }) },
        }
      ]
    })
    .overrideInterceptor(IdempotencyInterceptor)
    .useValue(mockIdempotencyInterceptor)
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<TransactionDraftController>(TransactionDraftController);
    service = module.get<TransactionDraftService>(TransactionDraftService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createDraft', () => {
    it('should call service.createDraft and return draft', async () => {
      const mockResult = { id: 'draft-1', status: TransactionStatus.DRAFT };
      mockService.createDraft = jest.fn().mockResolvedValue(mockResult);

      const dto = { header: { tenantId: 'tenant-1' } } as any;
      const result = await controller.createDraft(dto, { user: { id: 'user-1', organizationId: 'tenant-1' } });

      expect(service.createDraft).toHaveBeenCalledWith(dto, 'user-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateDraft', () => {
    it('should call service.updateDraft and return draft', async () => {
      const mockResult = { id: 'draft-1', status: TransactionStatus.DRAFT };
      mockService.updateDraft.mockResolvedValue(mockResult);

      const dto = { currentVersion: 1, payload: {} as any };
      const result = await controller.updateDraft('draft-1', dto, { user: { id: 'user-1', organizationId: 'tenant-1' } });

      expect(service.updateDraft).toHaveBeenCalledWith('draft-1', 'user-1', 'tenant-1', dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('approveDraft', () => {
    it('should call orchestrator.approveDraft', async () => {
      const mockResult = { id: 'draft-1', status: TransactionStatus.APPROVED };
      mockOrchestrator.approveDraft.mockResolvedValue(mockResult);

      const dto = { currentVersion: 2, reason: 'Looks good' };
      const result = await controller.approveDraft('draft-1', dto, { user: { id: 'user-2', organizationId: 'tenant-1' } });

      expect(mockOrchestrator.approveDraft).toHaveBeenCalledWith('draft-1', 'user-2', 'tenant-1', dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('rejectDraft', () => {
    it('should call service.rejectDraft', async () => {
      const mockResult = { id: 'draft-1', status: TransactionStatus.REJECTED };
      mockService.rejectDraft.mockResolvedValue(mockResult);

      const dto = { currentVersion: 3, reason: 'Missing cost center' };
      const result = await controller.rejectDraft('draft-1', dto, { user: { id: 'user-3', organizationId: 'tenant-1' } });

      expect(service.rejectDraft).toHaveBeenCalledWith('draft-1', 'user-3', 'tenant-1', dto);
      expect(result).toEqual(mockResult);
    });
  });
});
