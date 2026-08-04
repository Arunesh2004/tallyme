import { Injectable } from '@nestjs/common';
import { VmmsVendorBranchRepository } from '../../infrastructure/repositories/vmms-vendor-branch.repository';
import { VmmsVendorLedgerRepository } from '../../infrastructure/repositories/vmms-vendor-ledger.repository';
import { GSTINNormalizer } from './gstin-normalizer.service';
import { VmmsMatchResult } from '../models/vmms-match-result';
import { VmmsMatchStage } from '../models/vmms-match-stage.enum';
import { VmmsMatchReason } from '../models/vmms-match-reason.enum';
import { VendorLedgerDomain } from '../../infrastructure/repositories/vmms-repository.types';

@Injectable()
export class VmmsVendorMatcher {
  constructor(
    private readonly branchRepo: VmmsVendorBranchRepository,
    private readonly ledgerRepo: VmmsVendorLedgerRepository,
    private readonly normalizer: GSTINNormalizer,
  ) {}

  public async match(
    companyId: string,
    extractedGstin: string | null | undefined,
  ): Promise<VmmsMatchResult> {
    if (!extractedGstin) {
      return new VmmsMatchResult(null, null, VmmsMatchStage.NONE, 0, true, [
        VmmsMatchReason.GSTIN_MISSING,
      ]);
    }

    const normalized = this.normalizer.normalize(extractedGstin);
    if (!normalized) {
      return new VmmsMatchResult(null, null, VmmsMatchStage.NONE, 0, true, [
        VmmsMatchReason.GSTIN_INVALID,
      ]);
    }

    // Stage 1: Exact Match (Raw Input)
    let branch = await this.branchRepo.findByExactGstin(
      companyId,
      extractedGstin,
    );
    let stage = VmmsMatchStage.EXACT_GSTIN;
    let confidence = 100;

    // Stage 2: Normalized Match
    if (!branch) {
      branch = await this.branchRepo.findByNormalizedGstin(
        companyId,
        normalized,
      );
      stage = VmmsMatchStage.NORMALIZED_GSTIN;
      confidence = 95;
    }

    if (!branch) {
      return new VmmsMatchResult(null, null, VmmsMatchStage.NONE, 0, true, [
        VmmsMatchReason.NO_VENDOR_BRANCH,
      ]);
    }

    // Resolve Ledger
    const ledgers = await this.ledgerRepo.findByBranchId(branch.id);
    return this.resolveLedger(branch.id, ledgers, stage, confidence);
  }

  private resolveLedger(
    branchId: string,
    ledgers: VendorLedgerDomain[],
    stage: VmmsMatchStage,
    confidence: number,
  ): VmmsMatchResult {
    if (ledgers.length === 0) {
      return new VmmsMatchResult(branchId, null, stage, confidence, true, [
        VmmsMatchReason.LEDGER_NOT_FOUND,
      ]);
    }

    if (ledgers.length === 1) {
      return new VmmsMatchResult(
        branchId,
        ledgers[0].id,
        stage,
        confidence,
        false,
        [VmmsMatchReason.SUCCESS],
      );
    }

    return new VmmsMatchResult(branchId, null, stage, confidence, true, [
      VmmsMatchReason.MULTIPLE_LEDGERS,
    ]);
  }
}
