import { VmmsMatchStage } from './vmms-match-stage.enum';
import { VmmsMatchReason } from './vmms-match-reason.enum';

export class MatchEvidence {
  public readonly schemaVersion: string = 'v1.0';
  public readonly algorithmVersion: string = 'phase-b-stage1';

  constructor(
    public readonly timestamp: string,
    public readonly matchStage: VmmsMatchStage,
    public readonly matchedBy: string,
    public readonly confidence: number,
    public readonly normalizedInput: string | null,
    public readonly originalInput: string | null,
    public readonly vendorBranchId: string | null,
    public readonly vendorLedgerId: string | null,
    public readonly reasons: VmmsMatchReason[],
    public readonly requiresManualReview: boolean,
    public readonly ledgerResolution: string,
  ) {
    Object.freeze(this);
  }
}
