import {
  VmmsEvidenceBuilder,
  VmmsEvidenceBuilderParams,
} from '../../domain/services/vmms-evidence-builder';
import { VmmsMatchStage } from '../../domain/models/vmms-match-stage.enum';
import { VmmsMatchReason } from '../../domain/models/vmms-match-reason.enum';

describe('VmmsEvidenceBuilder', () => {
  let builder: VmmsEvidenceBuilder;

  beforeEach(() => {
    builder = new VmmsEvidenceBuilder();
  });

  const validParams: VmmsEvidenceBuilderParams = {
    timestamp: '2026-07-29T18:00:00Z',
    matchStage: VmmsMatchStage.EXACT_GSTIN,
    matchedBy: 'SYSTEM',
    confidence: 100,
    normalizedInput: '27ABCDE1234F1Z5',
    originalInput: '27ABCDE1234F1Z5',
    vendorBranchId: 'branch-1',
    vendorLedgerId: 'ledger-1',
    reasons: [VmmsMatchReason.SUCCESS],
    requiresManualReview: false,
    ledgerResolution: 'SINGLE_LEDGER',
  };

  it('should successfully build an immutable MatchEvidence object', () => {
    const evidence = builder.build(validParams);

    expect(evidence.schemaVersion).toBe('v1.0');
    expect(evidence.algorithmVersion).toBe('phase-b-stage1');
    expect(evidence.timestamp).toBe('2026-07-29T18:00:00Z');
    expect(evidence.confidence).toBe(100);
    expect(Object.isFrozen(evidence)).toBe(true);
  });

  it('should reject confidence > 100', () => {
    expect(() => builder.build({ ...validParams, confidence: 101 })).toThrow(
      'Confidence must be between 0 and 100',
    );
  });

  it('should reject confidence < 0', () => {
    expect(() => builder.build({ ...validParams, confidence: -1 })).toThrow(
      'Confidence must be between 0 and 100',
    );
  });

  it('should reject ledgerId without branchId', () => {
    expect(() =>
      builder.build({
        ...validParams,
        vendorBranchId: null,
        vendorLedgerId: 'ledger-1',
      }),
    ).toThrow('Cannot have ledgerId without branchId');
  });

  it('should reject SUCCESS reason without ledgerId', () => {
    expect(() =>
      builder.build({
        ...validParams,
        vendorLedgerId: null,
        reasons: [VmmsMatchReason.SUCCESS],
      }),
    ).toThrow('SUCCESS reason requires a resolved ledgerId');
  });

  it('should allow manual review build with multiple ledgers', () => {
    const evidence = builder.build({
      ...validParams,
      vendorLedgerId: null,
      reasons: [VmmsMatchReason.MULTIPLE_LEDGERS],
      requiresManualReview: true,
      ledgerResolution: 'MULTIPLE_LEDGERS',
      confidence: 95,
      matchStage: VmmsMatchStage.NORMALIZED_GSTIN,
    });

    expect(evidence.vendorLedgerId).toBeNull();
    expect(evidence.reasons).toEqual([VmmsMatchReason.MULTIPLE_LEDGERS]);
    expect(evidence.requiresManualReview).toBe(true);
  });

  it('should produce identical deterministic outputs given same inputs (except timestamp handled by caller)', () => {
    const output1 = builder.build(validParams);
    const output2 = builder.build(validParams);

    expect(output1).toEqual(output2);
  });
});
