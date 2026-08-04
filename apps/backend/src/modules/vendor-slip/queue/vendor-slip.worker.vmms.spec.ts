import { Test, TestingModule } from '@nestjs/testing';
import { VendorSlipWorker } from './vendor-slip.worker';
import { LoggerService } from '../../../core/logger/logger.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  VendorMatcher,
  ExpenseAllocator,
  LedgerMapper,
  ExpenseValidationPolicy,
} from '../domain/services';
import { TallyMasterIntelligenceService } from '../../erp-connector/services/tally-master-intelligence.service';
import { VendorIntelligenceService } from '../../accounting-intelligence/workflows/vendor-intelligence.service';
import { LedgerMappingEngine } from '../../accounting-intelligence/ledger-mapping/ledger-mapping.engine';
import { AccountingRulesEngine } from '../../accounting-intelligence/rules-engine/accounting-rules.engine';
import { AccountingIntelligenceService } from '../../accounting-intelligence/workflows/accounting-intelligence.service';
import { AccountingDecisionAuditService } from '../../accounting-intelligence/decision-audit/accounting-decision-audit.service';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { VmmsShadowExecutionService } from '../vmms/application/vmms-shadow-execution.service';
import { TransactionDraftService } from '../../universal-transaction/services/transaction-draft.service';
import { VendorSlipDraftAdapter } from '../application/vendor-slip-draft.adapter';
import { VmmsActiveExecutionService } from '../vmms/application/vmms-active-execution.service';
import { VmmsFeatureFlagService } from '../vmms/config/vmms-feature-flag.service';

describe('VendorSlipWorker - VMMS Integration', () => {
  let worker: VendorSlipWorker;
  let shadowExecutor: jest.Mocked<VmmsShadowExecutionService>;
  let matcher: jest.Mocked<VendorMatcher>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorSlipWorker,
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            invoiceCandidate: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: VendorMatcher,
          useValue: { match: jest.fn() },
        },
        {
          provide: LedgerMapper,
          useValue: { map: jest.fn() },
        },
        {
          provide: ExpenseAllocator,
          useValue: { allocate: jest.fn() },
        },
        {
          provide: ExpenseValidationPolicy,
          useValue: { validate: jest.fn() },
        },
        {
          provide: TallyMasterIntelligenceService,
          useValue: {},
        },
        {
          provide: VendorIntelligenceService,
          useValue: { preSyncValidation: jest.fn() },
        },
        {
          provide: LedgerMappingEngine,
          useValue: {
            resolveExpenseLedger: jest.fn(),
            resolveGstLedger: jest.fn(),
          },
        },
        {
          provide: AccountingIntelligenceService,
          useValue: { generateVoucherPayload: jest.fn() },
        },
        {
          provide: AccountingRulesEngine,
          useValue: { evaluate: jest.fn() },
        },
        {
          provide: AccountingDecisionAuditService,
          useValue: { logDecision: jest.fn() },
        },
        {
          provide: TransactionDraftService,
          useValue: { createDraft: jest.fn() },
        },
        {
          provide: VendorSlipDraftAdapter,
          useValue: { map: jest.fn() },
        },
        {
          provide: QUEUE_PROVIDER,
          useValue: { addJob: jest.fn() },
        },
        {
          provide: VmmsShadowExecutionService,
          useValue: { executeAsync: jest.fn() },
        },
        {
          provide: VmmsActiveExecutionService,
          useValue: { executeSync: jest.fn() },
        },
        {
          provide: VmmsFeatureFlagService,
          useValue: {
            isVmmsActiveEnforcementEnabled: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    worker = module.get<VendorSlipWorker>(VendorSlipWorker);
    shadowExecutor = module.get(
      VmmsShadowExecutionService,
    ) as jest.Mocked<VmmsShadowExecutionService>;
    matcher = module.get(VendorMatcher) as jest.Mocked<VendorMatcher>;
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockJob = {
    data: {
      candidateId: 'cand-1',
      companyId: 'comp-1',
      batchSyncItemId: 'batch-1',
    },
  } as any;

  const mockCandidate = {
    id: 'cand-1',
    documentId: 'doc-1',
    extractedName: 'Test Vendor',
    extractedGstin: '27ABCDE1234F1Z5',
    extractedData: { confidence: 0.9 },
    total: 100,
    subtotal: 100,
    tax: 0,
    date: new Date(),
    invoiceNumber: 'INV-001',
    status: 'PENDING',
  };

  it('should trigger shadow execution as fire-and-forget without waiting', async () => {
    (prisma.invoiceCandidate.findUnique as any).mockResolvedValue(
      mockCandidate as any,
    );
    matcher.match.mockResolvedValue({
      isFailure: false,
      value: { vendorId: 'v-1' },
    } as any);

    // Stub validate to fail so it exits early (easier to test just the shadow execution boundary)
    const validator = worker[
      'validator'
    ] as jest.Mocked<ExpenseValidationPolicy>;
    validator.validate.mockReturnValue({
      isFailure: true,
      error: 'Fail',
    } as any);

    // Make shadow executor take 10 seconds (Simulate slow VMMS)
    let vmmsDone = false;
    shadowExecutor.executeAsync.mockImplementation(async () => {
      return new Promise((resolve) =>
        setTimeout(() => {
          vmmsDone = true;
          resolve();
        }, 10000),
      );
    });

    const startTime = Date.now();
    await worker.process(mockJob);
    const duration = Date.now() - startTime;

    // The worker must finish immediately without waiting for VMMS
    expect(duration).toBeLessThan(1000);
    expect(vmmsDone).toBe(false);
    expect(shadowExecutor.executeAsync).toHaveBeenCalledWith(
      'cand-1',
      'comp-1',
      '27ABCDE1234F1Z5',
    );
    expect(shadowExecutor.executeAsync).toHaveBeenCalledTimes(1);
  });

  it('should isolate and swallow unhandled promise rejections from shadow executor', async () => {
    (prisma.invoiceCandidate.findUnique as any).mockResolvedValue(
      mockCandidate as any,
    );
    matcher.match.mockResolvedValue({
      isFailure: false,
      value: { vendorId: 'v-1' },
    } as any);

    const validator = worker[
      'validator'
    ] as jest.Mocked<ExpenseValidationPolicy>;
    validator.validate.mockReturnValue({
      isFailure: true,
      error: 'Fail',
    } as any);

    const logger = worker['logger'] as jest.Mocked<LoggerService>;

    // Simulate an uncaught rejection escaping the shadow executor
    shadowExecutor.executeAsync.mockImplementation(async () => {
      throw new Error('Fatal VMMS Crash');
    });

    // Worker must not throw
    await expect(worker.process(mockJob)).resolves.toBeDefined();

    // We expect the catch block to log the escaped error
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Fatal VMMS Crash'),
      expect.any(String),
      'VendorSlipWorker',
    );
  });
});
