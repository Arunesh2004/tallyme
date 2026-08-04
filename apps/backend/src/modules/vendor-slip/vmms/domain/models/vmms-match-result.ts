import { VmmsMatchStage } from './vmms-match-stage.enum';
import { VmmsMatchReason } from './vmms-match-reason.enum';

export class VmmsMatchResult {
  constructor(
    public readonly vendorBranchId: string | null,
    public readonly vendorLedgerId: string | null,
    public readonly stage: VmmsMatchStage,
    public readonly confidence: number,
    public readonly requiresManualReview: boolean,
    public readonly reasons: VmmsMatchReason[],
  ) {
    Object.freeze(this);
  }
}
