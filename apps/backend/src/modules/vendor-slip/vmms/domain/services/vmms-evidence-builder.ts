import { Injectable } from '@nestjs/common';
import { MatchEvidence } from '../models/match-evidence';
import { VmmsMatchStage } from '../models/vmms-match-stage.enum';
import { VmmsMatchReason } from '../models/vmms-match-reason.enum';

export interface VmmsEvidenceBuilderParams {
  timestamp: string;
  matchStage: VmmsMatchStage;
  matchedBy: string;
  confidence: number;
  normalizedInput: string | null;
  originalInput: string | null;
  vendorBranchId: string | null;
  vendorLedgerId: string | null;
  reasons: VmmsMatchReason[];
  requiresManualReview: boolean;
  ledgerResolution: string;
}

@Injectable()
export class VmmsEvidenceBuilder {
  public build(params: VmmsEvidenceBuilderParams): MatchEvidence {
    if (params.confidence < 0 || params.confidence > 100) {
      throw new Error('Programmer Error: Confidence must be between 0 and 100');
    }

    if (params.vendorLedgerId && !params.vendorBranchId) {
      throw new Error(
        'Programmer Error: Cannot have ledgerId without branchId',
      );
    }

    if (
      params.reasons.includes(VmmsMatchReason.SUCCESS) &&
      !params.vendorLedgerId
    ) {
      throw new Error(
        'Programmer Error: SUCCESS reason requires a resolved ledgerId',
      );
    }

    return new MatchEvidence(
      params.timestamp,
      params.matchStage,
      params.matchedBy,
      params.confidence,
      params.normalizedInput,
      params.originalInput,
      params.vendorBranchId,
      params.vendorLedgerId,
      params.reasons,
      params.requiresManualReview,
      params.ledgerResolution,
    );
  }
}
