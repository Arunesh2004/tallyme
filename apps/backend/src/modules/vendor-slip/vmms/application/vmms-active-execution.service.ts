import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { VmmsFeatureFlagService } from '../config/vmms-feature-flag.service';
import { VmmsVendorMatcher } from '../domain/services/vmms-matcher.service';
import { VmmsEvidenceBuilder } from '../domain/services/vmms-evidence-builder';
import { VmmsVendorMatchDecisionRepository } from '../infrastructure/repositories/vmms-vendor-match-decision.repository';
import { VmmsVendorLedgerRepository } from '../infrastructure/repositories/vmms-vendor-ledger.repository';
import { IVmmsMetricsService } from './vmms-shadow-execution.service';

export interface ActiveExecutionResult {
  requiresManualReview: boolean;
  selectedVendorLedgerId?: string;
  selectedVendorLedgerName?: string;
}

@Injectable()
export class VmmsActiveExecutionService {
  private readonly logger = new Logger(VmmsActiveExecutionService.name);

  constructor(
    private readonly featureFlags: VmmsFeatureFlagService,
    private readonly matcher: VmmsVendorMatcher,
    private readonly evidenceBuilder: VmmsEvidenceBuilder,
    private readonly decisionRepo: VmmsVendorMatchDecisionRepository,
    private readonly ledgerRepo: VmmsVendorLedgerRepository,
    @Optional()
    @Inject('IVmmsMetricsService')
    private readonly metricsService?: IVmmsMetricsService,
  ) {}

  public async executeSync(
    invoiceCandidateId: string,
    companyId: string,
    extractedGstin: string | null | undefined,
  ): Promise<ActiveExecutionResult> {
    const startTime = Date.now();

    try {
      this.emitMetric('VMMS_ACTIVE_MATCH_STARTED');
      const matchResult = await this.matcher.match(companyId, extractedGstin);
      this.emitMetric('VMMS_ACTIVE_MATCH_COMPLETED', {
        stage: matchResult.stage,
      });

      // Build Evidence
      const evidence = this.evidenceBuilder.build({
        timestamp: new Date().toISOString(),
        matchStage: matchResult.stage,
        matchedBy: 'SYSTEM',
        confidence: matchResult.confidence,
        normalizedInput: null,
        originalInput: extractedGstin ?? null,
        vendorBranchId: matchResult.vendorBranchId,
        vendorLedgerId: matchResult.vendorLedgerId,
        reasons: matchResult.reasons,
        requiresManualReview: matchResult.requiresManualReview,
        ledgerResolution: matchResult.vendorLedgerId
          ? 'SINGLE_LEDGER'
          : 'UNRESOLVED',
      });

      // Add Phase D enforcement flags
      const evidenceData = {
        ...evidence,
        executionMode: 'ENFORCED',
        manualOverride: false,
      };

      if (!matchResult.vendorLedgerId || matchResult.requiresManualReview) {
        this.emitMetric('VMMS_ACTIVE_MATCH_MANUAL_REVIEW');
        return { requiresManualReview: true };
      }

      this.emitMetric('VMMS_ACTIVE_DECISION_SAVE_STARTED');

      await this.decisionRepo.upsert({
        invoiceCandidateId,
        selectedVendorLedgerId: matchResult.vendorLedgerId,
        isAutomated: true,
        matchEvidence: evidenceData,
      });

      this.emitMetric('VMMS_ACTIVE_DECISION_SAVE_SUCCESS');

      const ledger = await this.ledgerRepo.findById(matchResult.vendorLedgerId);

      return {
        requiresManualReview: false,
        selectedVendorLedgerId: matchResult.vendorLedgerId,
        selectedVendorLedgerName: ledger?.erpLedgerCode,
      };
    } catch (error: any) {
      this.emitMetric('VMMS_ACTIVE_MATCH_FAILED');
      this.logger.error(
        `VMMS Active Execution Failed for candidate ${invoiceCandidateId}: ${error.message}`,
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.metricsService?.recordTime(
        'VMMS_ACTIVE_EXECUTION_DURATION',
        duration,
      );
    }
  }

  private emitMetric(name: string, tags?: Record<string, string>) {
    this.metricsService?.increment(name, tags);
    if (this.featureFlags.isDebugEnabled?.()) {
      this.logger.debug(`[Metric] ${name} ${JSON.stringify(tags || {})}`);
    }
  }
}
