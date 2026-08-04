import { Test, TestingModule } from '@nestjs/testing';
import {
  VmmsShadowExecutionService,
  IVmmsMetricsService,
} from '../../application/vmms-shadow-execution.service';
import { VmmsFeatureFlagService } from '../../config/vmms-feature-flag.service';
import { VmmsVendorMatcher } from '../../domain/services/vmms-matcher.service';
import { VmmsEvidenceBuilder } from '../../domain/services/vmms-evidence-builder';
import { VmmsVendorMatchDecisionRepository } from '../../infrastructure/repositories/vmms-vendor-match-decision.repository';
import { VmmsMatchResult } from '../../domain/models/vmms-match-result';
import { VmmsMatchStage } from '../../domain/models/vmms-match-stage.enum';
import { VmmsMatchReason } from '../../domain/models/vmms-match-reason.enum';
import { MatchEvidence } from '../../domain/models/match-evidence';

describe('VmmsShadowExecutionService', () => {
  let service: VmmsShadowExecutionService;
  let featureFlags: jest.Mocked<VmmsFeatureFlagService>;
  let matcher: jest.Mocked<VmmsVendorMatcher>;
  let evidenceBuilder: jest.Mocked<VmmsEvidenceBuilder>;
  let decisionRepo: jest.Mocked<VmmsVendorMatchDecisionRepository>;
  let metricsService: jest.Mocked<IVmmsMetricsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsShadowExecutionService,
        {
          provide: VmmsFeatureFlagService,
          useValue: {
            isVmmsEnabled: jest.fn(),
            isShadowMatcherEnabled: jest.fn(),
            isDualWriteEnabled: jest.fn(),
            isDebugEnabled: jest.fn(),
          },
        },
        {
          provide: VmmsVendorMatcher,
          useValue: {
            match: jest.fn(),
          },
        },
        {
          provide: VmmsEvidenceBuilder,
          useValue: {
            build: jest.fn(),
          },
        },
        {
          provide: VmmsVendorMatchDecisionRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: 'IVmmsMetricsService',
          useValue: {
            increment: jest.fn(),
            recordTime: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VmmsShadowExecutionService>(
      VmmsShadowExecutionService,
    );
    featureFlags = module.get(VmmsFeatureFlagService);
    matcher = module.get(VmmsVendorMatcher);
    evidenceBuilder = module.get(VmmsEvidenceBuilder);
    decisionRepo = module.get(VmmsVendorMatchDecisionRepository);
    metricsService = module.get('IVmmsMetricsService');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockEvidence = new MatchEvidence(
    '2026-07-29T18:00:00Z',
    VmmsMatchStage.EXACT_GSTIN,
    'SYSTEM',
    100,
    null,
    '27ABCDE1234F1Z5',
    'branch-1',
    'ledger-1',
    [VmmsMatchReason.SUCCESS],
    false,
    'SINGLE_LEDGER',
  );

  const mockMatchResult = new VmmsMatchResult(
    'branch-1',
    'ledger-1',
    VmmsMatchStage.EXACT_GSTIN,
    100,
    false,
    [VmmsMatchReason.SUCCESS],
  );

  it('should skip everything if VMMS master flag is disabled', async () => {
    featureFlags.isVmmsEnabled.mockReturnValue(false);

    await expect(
      service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
    ).resolves.not.toThrow();

    expect(metricsService.increment).toHaveBeenCalledWith(
      'VMMS_DISABLED',
      undefined,
    );
    expect(matcher.match).not.toHaveBeenCalled();
    expect(decisionRepo.create).not.toHaveBeenCalled();
  });

  it('should skip matcher if shadow matcher flag is disabled', async () => {
    featureFlags.isVmmsEnabled.mockReturnValue(true);
    featureFlags.isShadowMatcherEnabled.mockReturnValue(false);

    await expect(
      service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
    ).resolves.not.toThrow();

    expect(matcher.match).not.toHaveBeenCalled();
    expect(decisionRepo.create).not.toHaveBeenCalled();
  });

  it('should execute matcher but skip dual write if dual write flag is disabled', async () => {
    featureFlags.isVmmsEnabled.mockReturnValue(true);
    featureFlags.isShadowMatcherEnabled.mockReturnValue(true);
    featureFlags.isDualWriteEnabled.mockReturnValue(false);

    matcher.match.mockResolvedValue(mockMatchResult);
    evidenceBuilder.build.mockReturnValue(mockEvidence);

    await expect(
      service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
    ).resolves.not.toThrow();

    expect(matcher.match).toHaveBeenCalledWith('comp-1', '27ABCDE1234F1Z5');
    expect(evidenceBuilder.build).toHaveBeenCalled();
    expect(decisionRepo.create).not.toHaveBeenCalled(); // Skipped dual write
  });

  it('should complete full execution including dual write successfully', async () => {
    featureFlags.isVmmsEnabled.mockReturnValue(true);
    featureFlags.isShadowMatcherEnabled.mockReturnValue(true);
    featureFlags.isDualWriteEnabled.mockReturnValue(true);

    matcher.match.mockResolvedValue(mockMatchResult);
    evidenceBuilder.build.mockReturnValue(mockEvidence);
    decisionRepo.create.mockResolvedValue();

    await expect(
      service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
    ).resolves.not.toThrow();

    expect(matcher.match).toHaveBeenCalled();
    expect(evidenceBuilder.build).toHaveBeenCalled();
    expect(decisionRepo.create).toHaveBeenCalledWith({
      invoiceCandidateId: 'cand-1',
      selectedVendorLedgerId: 'ledger-1',
      isAutomated: true,
      matchEvidence: mockEvidence,
    });
    expect(metricsService.increment).toHaveBeenCalledWith(
      'VMMS_DUAL_WRITE_SUCCESS',
      undefined,
    );
  });

  it('should skip dual write and not throw if matcher cannot resolve ledger (Schema Constraint)', async () => {
    featureFlags.isVmmsEnabled.mockReturnValue(true);
    featureFlags.isShadowMatcherEnabled.mockReturnValue(true);
    featureFlags.isDualWriteEnabled.mockReturnValue(true);

    const unresolvedMatchResult = new VmmsMatchResult(
      'branch-1',
      null, // No ledger
      VmmsMatchStage.EXACT_GSTIN,
      100,
      true,
      [VmmsMatchReason.LEDGER_NOT_FOUND],
    );

    matcher.match.mockResolvedValue(unresolvedMatchResult);
    evidenceBuilder.build.mockReturnValue(mockEvidence); // Doesn't matter here

    await expect(
      service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
    ).resolves.not.toThrow();

    expect(decisionRepo.create).not.toHaveBeenCalled();
    expect(metricsService.increment).toHaveBeenCalledWith(
      'VMMS_DUAL_WRITE_SKIPPED_UNRESOLVED_LEDGER',
      undefined,
    );
  });

  describe('Exception Isolation', () => {
    beforeEach(() => {
      featureFlags.isVmmsEnabled.mockReturnValue(true);
      featureFlags.isShadowMatcherEnabled.mockReturnValue(true);
      featureFlags.isDualWriteEnabled.mockReturnValue(true);
    });

    it('should swallow and isolate matcher failures', async () => {
      matcher.match.mockRejectedValue(new Error('Matcher Exploded'));

      await expect(
        service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
      ).resolves.not.toThrow();
      expect(metricsService.increment).toHaveBeenCalledWith(
        'VMMS_MATCH_FAILED',
        undefined,
      );
    });

    it('should swallow and isolate evidence builder failures', async () => {
      matcher.match.mockResolvedValue(mockMatchResult);
      evidenceBuilder.build.mockImplementation(() => {
        throw new Error('Builder Exploded');
      });

      await expect(
        service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
      ).resolves.not.toThrow();
      expect(metricsService.increment).toHaveBeenCalledWith(
        'VMMS_MATCH_FAILED',
        undefined,
      );
    });

    it('should swallow and isolate dual-write repository failures', async () => {
      matcher.match.mockResolvedValue(mockMatchResult);
      evidenceBuilder.build.mockReturnValue(mockEvidence);
      decisionRepo.create.mockRejectedValue(new Error('DB Timeout'));

      await expect(
        service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
      ).resolves.not.toThrow();
      expect(metricsService.increment).toHaveBeenCalledWith(
        'VMMS_DUAL_WRITE_FAILED',
        undefined,
      );
    });

    it('should still record execution time on failure', async () => {
      matcher.match.mockRejectedValue(new Error('Total failure'));

      await expect(
        service.executeAsync('cand-1', 'comp-1', '27ABCDE1234F1Z5'),
      ).resolves.not.toThrow();

      expect(metricsService.recordTime).toHaveBeenCalledWith(
        'VMMS_EXECUTION_DURATION',
        expect.any(Number),
      );
    });
  });
});
