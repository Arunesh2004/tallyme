import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { VmmsFeatureFlagService } from '../config/vmms-feature-flag.service';
import { VmmsVendorMatcher } from '../domain/services/vmms-matcher.service';
import { VmmsEvidenceBuilder } from '../domain/services/vmms-evidence-builder';
import { VmmsVendorMatchDecisionRepository } from '../infrastructure/repositories/vmms-vendor-match-decision.repository';

export interface IVmmsMetricsService {
  increment(metricName: string, tags?: Record<string, string>): void;
  recordTime(
    metricName: string,
    durationMs: number,
    tags?: Record<string, string>,
  ): void;
}

@Injectable()
export class VmmsShadowExecutionService {
  private readonly logger = new Logger(VmmsShadowExecutionService.name);

  constructor(
    private readonly featureFlags: VmmsFeatureFlagService,
    private readonly matcher: VmmsVendorMatcher,
    private readonly evidenceBuilder: VmmsEvidenceBuilder,
    private readonly decisionRepo: VmmsVendorMatchDecisionRepository,
    @Optional()
    @Inject('IVmmsMetricsService')
    private readonly metricsService?: IVmmsMetricsService,
  ) {}

  public async executeAsync(
    invoiceCandidateId: string,
    companyId: string,
    extractedGstin: string | null | undefined,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.featureFlags.isVmmsEnabled()) {
        this.emitMetric('VMMS_DISABLED');
        return;
      }

      if (!this.featureFlags.isShadowMatcherEnabled()) {
        return;
      }

      this.emitMetric('VMMS_MATCH_STARTED');
      const matchResult = await this.matcher.match(companyId, extractedGstin);
      this.emitMetric('VMMS_MATCH_COMPLETED', { stage: matchResult.stage });

      // Build Evidence
      const evidence = this.evidenceBuilder.build({
        timestamp: new Date().toISOString(),
        matchStage: matchResult.stage,
        matchedBy: 'SYSTEM',
        confidence: matchResult.confidence,
        normalizedInput: null, // Handled internally by matcher, omit for now to decouple
        originalInput: extractedGstin ?? null,
        vendorBranchId: matchResult.vendorBranchId,
        vendorLedgerId: matchResult.vendorLedgerId,
        reasons: matchResult.reasons,
        requiresManualReview: matchResult.requiresManualReview,
        ledgerResolution: matchResult.vendorLedgerId
          ? 'SINGLE_LEDGER'
          : 'UNRESOLVED',
      });

      if (!this.featureFlags.isDualWriteEnabled()) {
        return;
      }

      // If no ledger resolved, we cannot dual write to VendorMatchDecision because selectedVendorLedgerId is non-nullable.
      if (!matchResult.vendorLedgerId) {
        this.emitMetric('VMMS_DUAL_WRITE_SKIPPED_UNRESOLVED_LEDGER');
        return;
      }

      this.emitMetric('VMMS_DUAL_WRITE_STARTED');

      await this.decisionRepo.create({
        invoiceCandidateId,
        selectedVendorLedgerId: matchResult.vendorLedgerId,
        isAutomated: true,
        matchEvidence: evidence,
      });

      this.emitMetric('VMMS_DUAL_WRITE_SUCCESS');
    } catch (error: any) {
      this.emitMetric('VMMS_MATCH_FAILED');
      this.emitMetric('VMMS_DUAL_WRITE_FAILED');

      if (this.featureFlags.isDebugEnabled?.()) {
        this.logger.error(
          `VMMS Execution Failed for candidate ${invoiceCandidateId}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `VMMS Execution Failed for candidate ${invoiceCandidateId}: ${error.message}`,
        );
      }

      // ISOLATION: Swallow all VMMS failures. The public API MUST NEVER reject.
      return;
    } finally {
      const duration = Date.now() - startTime;
      this.metricsService?.recordTime('VMMS_EXECUTION_DURATION', duration);
    }
  }

  private emitMetric(name: string, tags?: Record<string, string>) {
    this.metricsService?.increment(name, tags);
    if (this.featureFlags.isDebugEnabled?.()) {
      this.logger.debug(`[Metric] ${name} ${JSON.stringify(tags || {})}`);
    }
  }
}
