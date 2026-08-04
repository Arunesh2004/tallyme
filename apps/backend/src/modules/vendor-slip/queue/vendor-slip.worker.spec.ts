import { Test, TestingModule } from '@nestjs/testing';
import { VendorSlipWorker } from './vendor-slip.worker';
import { LoggerService } from '../../../core/logger/logger.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { VendorMatcher, LedgerMapper, ExpenseAllocator, ExpenseValidationPolicy } from '../domain/services';
import { TallyMasterIntelligenceService } from '../../erp-connector/services/tally-master-intelligence.service';
import { VendorIntelligenceService } from '../../accounting-intelligence/workflows/vendor-intelligence.service';
import { AccountingIntelligenceService } from '../../accounting-intelligence/workflows/accounting-intelligence.service';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { VmmsShadowExecutionService } from '../vmms/application/vmms-shadow-execution.service';
import { VmmsActiveExecutionService } from '../vmms/application/vmms-active-execution.service';
import { VmmsFeatureFlagService } from '../vmms/config/vmms-feature-flag.service';
import { TransactionDraftService } from '../../universal-transaction/services/transaction-draft.service';
import { VendorSlipDraftAdapter } from '../application/vendor-slip-draft.adapter';

describe('VendorSlipWorker', () => {
  let worker: VendorSlipWorker;
  let prisma: any;
  let matcher: any;
  let vmmsActive: any;
  let featureFlags: any;
  let vendorIntel: any;
  let accIntel: any;
  let draftService: any;
  let adapter: any;
  let logger: any;

  beforeEach(async () => {
    prisma = {
      invoiceCandidate: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      documentReviewQueue: {
        create: jest.fn(),
      }
    };
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    matcher = { match: jest.fn() };
    vmmsActive = { executeSync: jest.fn() };
    featureFlags = { isVmmsActiveEnforcementEnabled: jest.fn().mockReturnValue(false) };
    vendorIntel = { preSyncValidation: jest.fn().mockResolvedValue(true) };
    accIntel = { generateVoucherPayload: jest.fn().mockResolvedValue({}) };
    draftService = { createDraft: jest.fn().mockResolvedValue(null) };
    adapter = { map: jest.fn().mockReturnValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorSlipWorker,
        { provide: LoggerService, useValue: logger },
        { provide: PrismaService, useValue: prisma },
        { provide: VendorMatcher, useValue: matcher },
        { provide: LedgerMapper, useValue: { map: jest.fn().mockResolvedValue({ defaultLedgerCode: 'VendorLedger' }) } },
        { provide: ExpenseAllocator, useValue: {} },
        { provide: ExpenseValidationPolicy, useValue: { validate: jest.fn().mockReturnValue({ isFailure: false }) } },
        { provide: TallyMasterIntelligenceService, useValue: {} },
        { provide: VendorIntelligenceService, useValue: vendorIntel },
        { provide: AccountingIntelligenceService, useValue: accIntel },
        { provide: QUEUE_PROVIDER, useValue: {} },
        { provide: VmmsShadowExecutionService, useValue: { executeAsync: jest.fn().mockResolvedValue(null) } },
        { provide: VmmsActiveExecutionService, useValue: vmmsActive },
        { provide: VmmsFeatureFlagService, useValue: featureFlags },
        { provide: TransactionDraftService, useValue: draftService },
        { provide: VendorSlipDraftAdapter, useValue: adapter },
      ],
    }).compile();

    worker = module.get<VendorSlipWorker>(VendorSlipWorker);
  });

  it('should throw error if candidate not found', async () => {
    prisma.invoiceCandidate.findUnique.mockResolvedValue(null);
    await expect(worker.process({ data: { candidateId: '1' } } as any)).rejects.toThrow(/InvoiceCandidate not found/);
  });

  it('should route to MANUAL_REVIEW if confidence < 80', async () => {
    prisma.invoiceCandidate.findUnique.mockResolvedValue({ id: '1', total: 100, extractedData: { confidence: 0.79 } });
    const res = await worker.process({ data: { candidateId: '1' } } as any);
    expect(res.status).toBe('MANUAL_REVIEW');
    expect(prisma.documentReviewQueue.create).toHaveBeenCalled();
  });

  it('should route to MANUAL_REVIEW if vmms active enforcement requires review', async () => {
    featureFlags.isVmmsActiveEnforcementEnabled.mockReturnValue(true);
    prisma.invoiceCandidate.findUnique.mockResolvedValue({ id: '1', total: 100, extractedData: { confidence: 0.90 } });
    vmmsActive.executeSync.mockResolvedValue({ requiresManualReview: true });
    
    const res = await worker.process({ data: { candidateId: '1' } } as any);
    expect(res.status).toBe('MANUAL_REVIEW');
    expect(res.reason).toMatch(/VMMS requires manual review/);
  });

  it('should route to MANUAL_REVIEW if pre-sync validation fails', async () => {
    featureFlags.isVmmsActiveEnforcementEnabled.mockReturnValue(true);
    prisma.invoiceCandidate.findUnique.mockResolvedValue({ id: '1', total: 100, extractedData: { confidence: 0.90 } });
    vmmsActive.executeSync.mockResolvedValue({ requiresManualReview: false, selectedVendorLedgerId: 'vid', selectedVendorLedgerName: 'vname' });
    vendorIntel.preSyncValidation.mockResolvedValue(false);
    
    const res = await worker.process({ data: { candidateId: '1' } } as any);
    expect(res.status).toBe('MANUAL_REVIEW');
  });

  it('should queue draft successfully', async () => {
    featureFlags.isVmmsActiveEnforcementEnabled.mockReturnValue(true);
    prisma.invoiceCandidate.findUnique.mockResolvedValue({ id: '1', total: 100, extractedData: { confidence: 0.90 } });
    vmmsActive.executeSync.mockResolvedValue({ requiresManualReview: false, selectedVendorLedgerId: 'vid', selectedVendorLedgerName: 'vname' });
    vendorIntel.preSyncValidation.mockResolvedValue(true);
    
    const res = await worker.process({ data: { candidateId: '1' } } as any);
    expect(res.status).toBe('QUEUED');
    expect(draftService.createDraft).toHaveBeenCalled();
  });

  it('should catch DuplicateDetectedException and mark as FAILED', async () => {
    featureFlags.isVmmsActiveEnforcementEnabled.mockReturnValue(true);
    prisma.invoiceCandidate.findUnique.mockResolvedValue({ id: '1', total: 100, extractedData: { confidence: 0.90 } });
    vmmsActive.executeSync.mockResolvedValue({ requiresManualReview: false, selectedVendorLedgerId: 'vid', selectedVendorLedgerName: 'vname' });
    
    const dupError = new Error('DuplicateDetectedException');
    dupError.name = 'DuplicateDetectedException';
    draftService.createDraft.mockRejectedValue(dupError);
    
    const res = await worker.process({ data: { candidateId: '1' } } as any);
    expect(res.status).toBe('FAILED');
    expect(prisma.invoiceCandidate.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'FAILED' } }));
  });
});
