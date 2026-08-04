import { LedgerResolutionResult } from '../../domain/models/ledger-resolution-result';
import { MatchEvidence } from '../../domain/models/match-evidence';
import { VmmsMatchResult } from '../../domain/models/vmms-match-result';
import { VmmsMatchStage } from '../../domain/models/vmms-match-stage.enum';
import { VmmsMatchReason } from '../../domain/models/vmms-match-reason.enum';

describe('Domain Models', () => {
  describe('MatchEvidence', () => {
    it('should be immutable after creation', () => {
      const evidence = new MatchEvidence(
        new Date().toISOString(),
        VmmsMatchStage.EXACT_GSTIN,
        'SYSTEM',
        100,
        '27ABCDE1234F1Z5',
        '27ABCDE1234F1Z5',
        'branch-1',
        'ledger-1',
        [VmmsMatchReason.SUCCESS],
        false,
        'SINGLE_LEDGER',
      );

      expect(evidence.schemaVersion).toBe('v1.0');
      expect(evidence.algorithmVersion).toBe('phase-b-stage1');
      expect(evidence.matchStage).toBe(VmmsMatchStage.EXACT_GSTIN);
      expect(Object.isFrozen(evidence)).toBe(true);

      expect(() => {
        (evidence as any).confidence = 90;
      }).toThrow();
    });
  });

  describe('VmmsMatchResult', () => {
    it('should be immutable after creation', () => {
      const result = new VmmsMatchResult(
        'branch-1',
        'ledger-1',
        VmmsMatchStage.NORMALIZED_GSTIN,
        95,
        false,
        [VmmsMatchReason.SUCCESS],
      );

      expect(result.vendorBranchId).toBe('branch-1');
      expect(Object.isFrozen(result)).toBe(true);

      expect(() => {
        (result as any).confidence = 100;
      }).toThrow();
    });
  });

  describe('LedgerResolutionResult', () => {
    it('should correctly store fields', () => {
      const result = new LedgerResolutionResult(
        'ledger-1',
        true,
        'Single ledger found',
      );
      expect(result.ledgerId).toBe('ledger-1');
      expect(result.isResolved).toBe(true);
      expect(result.reason).toBe('Single ledger found');
    });
  });
});
