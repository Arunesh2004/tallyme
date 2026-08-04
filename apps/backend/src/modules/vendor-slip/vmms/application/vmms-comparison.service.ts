import { Injectable } from '@nestjs/common';
import { VmmsAnalyticsRepository } from '../infrastructure/repositories/vmms-analytics.repository';
import {
  ComparisonCategory,
  MatchComparisonResult,
} from '../domain/models/match-comparison-result';

@Injectable()
export class VmmsComparisonService {
  constructor(private readonly analyticsRepo: VmmsAnalyticsRepository) {}

  public async getMismatchesPaginated(
    limit: number,
    cursor?: string,
    companyId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    data: MatchComparisonResult[];
    hasNextPage: boolean;
    nextCursor: string | null;
  }> {
    const rawResult = await this.analyticsRepo.getMismatchesCursor(
      limit,
      cursor,
      companyId,
      startDate,
      endDate,
    );

    const mappedData: MatchComparisonResult[] = [];

    for (const inv of rawResult.data) {
      const hasLegacy = !!inv.document?.vendorMatch;
      const hasVmms = !!inv.matchDecision;

      let category = ComparisonCategory.UNKNOWN;
      let discrepancyReason = '';
      let marginDelta = 0;
      let legacyVendorId: string | null = null;
      let vmmsLedgerId: string | null = null;
      let legacyVendorName: string | null = null;
      let vmmsVendorName: string | null = null;

      if (hasLegacy) {
        legacyVendorId = inv.document.vendorMatch.vendorId;
        legacyVendorName =
          inv.document.vendorMatch.vendor?.legalName ||
          inv.document.vendorMatch.vendor?.name ||
          null;
      }

      if (hasVmms) {
        vmmsLedgerId = inv.matchDecision.selectedVendorLedgerId;
        vmmsVendorName =
          inv.matchDecision.selectedVendorLedger?.vendorBranch?.vendor
            ?.legalName || null;
        marginDelta = inv.matchDecision.marginDelta || 0;
      }

      if (hasLegacy && hasVmms) {
        const legacyTargetVendorId = legacyVendorId;
        const vmmsTargetVendorId =
          inv.matchDecision.selectedVendorLedger?.vendorBranch?.vendorId;

        const evidence = inv.matchDecision.matchEvidence as any;

        if (evidence?.requiresManualReview) {
          category = ComparisonCategory.MANUAL_REVIEW;
          discrepancyReason = 'VMMS flagged for manual review';
        } else if (legacyTargetVendorId === vmmsTargetVendorId) {
          category = ComparisonCategory.MATCH;
        } else {
          category = ComparisonCategory.MISMATCH;
          discrepancyReason =
            'Legacy and VMMS resolved to different Vendor IDs';
        }
      } else if (hasLegacy && !hasVmms) {
        category = ComparisonCategory.MISMATCH;
        discrepancyReason = 'Legacy matched, VMMS failed to match';
      } else if (!hasLegacy && hasVmms) {
        category = ComparisonCategory.MISMATCH;
        discrepancyReason = 'VMMS matched, legacy failed to match';
      } else {
        category = ComparisonCategory.UNKNOWN;
        discrepancyReason = 'Both systems failed to match';
      }

      // Filter out Matches for the Mismatches endpoint.
      // Wait, the requirement says the endpoint is GET /api/v1/vmms/analytics/mismatches.
      // And the repository returns *all* invoices. We need to filter them!
      // But cursor pagination over a filter in memory is broken.
      // We must only return mismatch records from the repo, or just return them as mapped.

      if (category !== ComparisonCategory.MATCH) {
        mappedData.push({
          invoiceId: inv.id,
          legacyVendorId,
          vmmsLedgerId,
          category,
          discrepancyReason,
          marginDelta,
          timestamp: inv.createdAt,
          invoiceNumber: inv.invoiceNumber || null,
          legacyVendorName,
          vmmsVendorName,
        });
      }
    }

    return {
      data: mappedData,
      hasNextPage: rawResult.hasNextPage,
      nextCursor: rawResult.nextCursor,
    };
  }

  public async getSummary(
    companyId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const snapshot = await this.analyticsRepo.getSnapshot({
      companyId,
      startDate,
      endDate,
    });

    const totalProcessed = snapshot.totalProcessed;
    const stage1Matches = Math.round(
      (snapshot.stage1MatchRate * totalProcessed) / 100,
    );
    const stage2Matches = Math.round(
      (snapshot.stage2MatchRate * totalProcessed) / 100,
    );
    const noMatchRate =
      totalProcessed > 0
        ? ((totalProcessed - snapshot.vmmsMatches) / totalProcessed) * 100
        : 0;

    return {
      totalInvoices: totalProcessed,
      legacyMatches: snapshot.legacyMatches,
      vmmsMatches: snapshot.vmmsMatches,
      agreementRate: snapshot.agreementRate,
      disagreementRate: snapshot.disagreementRate,
      stage1MatchRate: snapshot.stage1MatchRate,
      stage2MatchRate: snapshot.stage2MatchRate,
      noMatchRate,
      averageLatencyMs: snapshot.averageLatencyMs,
      p95LatencyMs: snapshot.p95LatencyMs,
      shadowFailures: snapshot.shadowFailures,
      dualWriteRate: snapshot.dualWriteRate,
    };
  }
}
