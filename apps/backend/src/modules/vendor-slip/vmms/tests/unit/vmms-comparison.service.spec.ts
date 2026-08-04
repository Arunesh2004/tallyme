import { Test, TestingModule } from '@nestjs/testing';
import { VmmsComparisonService } from '../../application/vmms-comparison.service';
import { VmmsAnalyticsRepository } from '../../infrastructure/repositories/vmms-analytics.repository';
import { ComparisonCategory } from '../../domain/models/match-comparison-result';

describe('VmmsComparisonService', () => {
  let service: VmmsComparisonService;
  let repository: jest.Mocked<VmmsAnalyticsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsComparisonService,
        {
          provide: VmmsAnalyticsRepository,
          useValue: {
            getMismatchesCursor: jest.fn(),
            getSnapshot: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VmmsComparisonService>(VmmsComparisonService);
    repository = module.get(
      VmmsAnalyticsRepository,
    ) as jest.Mocked<VmmsAnalyticsRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMismatchesPaginated', () => {
    it('should correctly classify MANUAL_REVIEW', async () => {
      repository.getMismatchesCursor.mockResolvedValue({
        hasNextPage: false,
        nextCursor: null,
        data: [
          {
            id: 'inv-1',
            createdAt: new Date(),
            document: { vendorMatch: { vendorId: 'v1' } },
            matchDecision: {
              selectedVendorLedgerId: 'vl1',
              selectedVendorLedger: { vendorBranch: { vendorId: 'v1' } },
              matchEvidence: { requiresManualReview: true },
            },
          },
        ],
      });

      const result = await service.getMismatchesPaginated(10);
      expect(result.data[0].category).toBe(ComparisonCategory.MANUAL_REVIEW);
    });

    it('should correctly classify MISMATCH when legacy and VMMS pick different vendors', async () => {
      repository.getMismatchesCursor.mockResolvedValue({
        hasNextPage: false,
        nextCursor: null,
        data: [
          {
            id: 'inv-2',
            createdAt: new Date(),
            document: { vendorMatch: { vendorId: 'v-legacy' } },
            matchDecision: {
              selectedVendorLedgerId: 'vl1',
              selectedVendorLedger: { vendorBranch: { vendorId: 'v-vmms' } },
              matchEvidence: { requiresManualReview: false },
            },
          },
        ],
      });

      const result = await service.getMismatchesPaginated(10);
      expect(result.data[0].category).toBe(ComparisonCategory.MISMATCH);
    });

    it('should correctly classify MISMATCH when only one system matches', async () => {
      repository.getMismatchesCursor.mockResolvedValue({
        hasNextPage: false,
        nextCursor: null,
        data: [
          {
            id: 'inv-3',
            createdAt: new Date(),
            document: { vendorMatch: null },
            matchDecision: {
              selectedVendorLedgerId: 'vl1',
              selectedVendorLedger: { vendorBranch: { vendorId: 'v-vmms' } },
              matchEvidence: {},
            },
          },
        ],
      });

      const result = await service.getMismatchesPaginated(10);
      expect(result.data[0].category).toBe(ComparisonCategory.MISMATCH);
    });
  });

  describe('getSummary', () => {
    it('should map snapshot to summary response', async () => {
      repository.getSnapshot.mockResolvedValue({
        timestamp: new Date(),
        totalProcessed: 100,
        legacyMatches: 80,
        vmmsMatches: 90,
        agreementRate: 85,
        disagreementRate: 15,
        stage1MatchRate: 50,
        stage2MatchRate: 40,
        manualReviewRate: 10,
        dualWriteRate: 100,
        shadowFailures: 2,
        averageLatencyMs: 15.5,
        p95LatencyMs: 40.2,
      });

      const summary = await service.getSummary();
      expect(summary.totalInvoices).toBe(100);
      expect(summary.legacyMatches).toBe(80);
      expect(summary.vmmsMatches).toBe(90);
      expect(summary.noMatchRate).toBe(10);
      expect(summary.stage1MatchRate).toBe(50);
      expect(summary.shadowFailures).toBe(2);
    });
  });
});
