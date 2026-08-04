import { Test, TestingModule } from '@nestjs/testing';
import { VmmsVendorMatcher } from '../../domain/services/vmms-matcher.service';
import { VmmsVendorBranchRepository } from '../../infrastructure/repositories/vmms-vendor-branch.repository';
import { VmmsVendorLedgerRepository } from '../../infrastructure/repositories/vmms-vendor-ledger.repository';
import { GSTINNormalizer } from '../../domain/services/gstin-normalizer.service';
import { VmmsMatchStage } from '../../domain/models/vmms-match-stage.enum';
import { VmmsMatchReason } from '../../domain/models/vmms-match-reason.enum';

describe('VmmsVendorMatcher', () => {
  let matcher: VmmsVendorMatcher;
  let branchRepo: jest.Mocked<VmmsVendorBranchRepository>;
  let ledgerRepo: jest.Mocked<VmmsVendorLedgerRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsVendorMatcher,
        GSTINNormalizer,
        {
          provide: VmmsVendorBranchRepository,
          useValue: {
            findByExactGstin: jest.fn(),
            findByNormalizedGstin: jest.fn(),
          },
        },
        {
          provide: VmmsVendorLedgerRepository,
          useValue: {
            findByBranchId: jest.fn(),
          },
        },
      ],
    }).compile();

    matcher = module.get<VmmsVendorMatcher>(VmmsVendorMatcher);
    branchRepo = module.get(VmmsVendorBranchRepository);
    ledgerRepo = module.get(VmmsVendorLedgerRepository);
  });

  it('should return GSTIN_MISSING if input is null', async () => {
    const result = await matcher.match('comp-1', null);
    expect(result.stage).toBe(VmmsMatchStage.NONE);
    expect(result.requiresManualReview).toBe(true);
    expect(result.reasons).toEqual([VmmsMatchReason.GSTIN_MISSING]);
  });

  it('should return GSTIN_INVALID if normalizer strips input to empty', async () => {
    const result = await matcher.match('comp-1', '---');
    expect(result.stage).toBe(VmmsMatchStage.NONE);
    expect(result.requiresManualReview).toBe(true);
    expect(result.reasons).toEqual([VmmsMatchReason.GSTIN_INVALID]);
  });

  it('should return NO_VENDOR_BRANCH if neither exact nor normalized matches', async () => {
    branchRepo.findByExactGstin.mockResolvedValue(null);
    branchRepo.findByNormalizedGstin.mockResolvedValue(null);

    const result = await matcher.match('comp-1', '27ABCDE1234F1Z5');
    expect(result.stage).toBe(VmmsMatchStage.NONE);
    expect(result.reasons).toEqual([VmmsMatchReason.NO_VENDOR_BRANCH]);
  });

  it('should match EXACT_GSTIN and resolve single ledger (Success)', async () => {
    branchRepo.findByExactGstin.mockResolvedValue({ id: 'branch-1' } as any);
    ledgerRepo.findByBranchId.mockResolvedValue([{ id: 'ledger-1' }] as any);

    const result = await matcher.match('comp-1', '27ABCDE1234F1Z5');
    expect(result.stage).toBe(VmmsMatchStage.EXACT_GSTIN);
    expect(result.confidence).toBe(100);
    expect(result.vendorBranchId).toBe('branch-1');
    expect(result.vendorLedgerId).toBe('ledger-1');
    expect(result.requiresManualReview).toBe(false);
    expect(result.reasons).toEqual([VmmsMatchReason.SUCCESS]);
  });

  it('should match NORMALIZED_GSTIN and resolve single ledger (Success)', async () => {
    branchRepo.findByExactGstin.mockResolvedValue(null);
    branchRepo.findByNormalizedGstin.mockResolvedValue({
      id: 'branch-1',
    } as any);
    ledgerRepo.findByBranchId.mockResolvedValue([{ id: 'ledger-1' }] as any);

    const result = await matcher.match('comp-1', '27 ABCDE-1234 F1-Z5');
    expect(result.stage).toBe(VmmsMatchStage.NORMALIZED_GSTIN);
    expect(result.confidence).toBe(95);
    expect(result.vendorBranchId).toBe('branch-1');
    expect(result.vendorLedgerId).toBe('ledger-1');
    expect(result.requiresManualReview).toBe(false);
    expect(result.reasons).toEqual([VmmsMatchReason.SUCCESS]);
  });

  it('should return LEDGER_NOT_FOUND if branch matched but has 0 ledgers', async () => {
    branchRepo.findByExactGstin.mockResolvedValue({ id: 'branch-1' } as any);
    ledgerRepo.findByBranchId.mockResolvedValue([]);

    const result = await matcher.match('comp-1', '27ABCDE1234F1Z5');
    expect(result.vendorBranchId).toBe('branch-1');
    expect(result.vendorLedgerId).toBeNull();
    expect(result.requiresManualReview).toBe(true);
    expect(result.reasons).toEqual([VmmsMatchReason.LEDGER_NOT_FOUND]);
  });

  it('should return MULTIPLE_LEDGERS if branch matched but has >1 ledgers', async () => {
    branchRepo.findByExactGstin.mockResolvedValue({ id: 'branch-1' } as any);
    ledgerRepo.findByBranchId.mockResolvedValue([
      { id: 'ledger-1' },
      { id: 'ledger-2' },
    ] as any);

    const result = await matcher.match('comp-1', '27ABCDE1234F1Z5');
    expect(result.vendorBranchId).toBe('branch-1');
    expect(result.vendorLedgerId).toBeNull();
    expect(result.requiresManualReview).toBe(true);
    expect(result.reasons).toEqual([VmmsMatchReason.MULTIPLE_LEDGERS]);
  });

  it('should propagate repository infrastructure failures transparently', async () => {
    branchRepo.findByExactGstin.mockRejectedValue(new Error('DB Timeout'));
    await expect(matcher.match('comp-1', '27ABCDE1234F1Z5')).rejects.toThrow(
      'DB Timeout',
    );
  });
});
