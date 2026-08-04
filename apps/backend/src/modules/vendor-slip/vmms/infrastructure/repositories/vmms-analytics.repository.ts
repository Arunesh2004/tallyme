import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { VmmsAnalyticsSnapshot } from '../../domain/models/vmms-analytics-snapshot';

export interface AnalyticsFilter {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class VmmsAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async getSnapshot(
    filter: AnalyticsFilter,
  ): Promise<VmmsAnalyticsSnapshot> {
    let whereClause = Prisma.sql`WHERE 1=1`;
    if (filter.companyId) {
      whereClause = Prisma.sql`${whereClause} AND d."companyId" = ${filter.companyId}::uuid`;
    }
    if (filter.startDate) {
      whereClause = Prisma.sql`${whereClause} AND ic."createdAt" >= ${filter.startDate}`;
    }
    if (filter.endDate) {
      whereClause = Prisma.sql`${whereClause} AND ic."createdAt" <= ${filter.endDate}`;
    }

    const query = Prisma.sql`
      SELECT
        COUNT(ic.id)::int AS "totalProcessed",
        COUNT(vm.id)::int AS "legacyMatches",
        COUNT(vmd.id)::int AS "vmmsMatches",
        COUNT(CASE WHEN vm."vendorId" = vb."vendorId" THEN 1 END)::int AS "agreements",
        COUNT(CASE WHEN (vm."vendorId" IS DISTINCT FROM vb."vendorId") AND (vm.id IS NOT NULL OR vmd.id IS NOT NULL) THEN 1 END)::int AS "disagreements",
        COUNT(CASE WHEN vmd."matchEvidence"->>'matchStage' = 'STAGE_1_EXACT_GSTIN' THEN 1 END)::int AS "stage1Matches",
        COUNT(CASE WHEN vmd."matchEvidence"->>'matchStage' = 'STAGE_2_NORMALIZED_GSTIN' THEN 1 END)::int AS "stage2Matches",
        COUNT(CASE WHEN vmd."matchEvidence"->>'requiresManualReview' = 'true' THEN 1 END)::int AS "manualReviews"
      FROM "InvoiceCandidate" ic
      LEFT JOIN "Document" d ON ic."documentId" = d.id
      LEFT JOIN "VendorMatch" vm ON d.id = vm."documentId"
      LEFT JOIN "VendorMatchDecision" vmd ON ic.id = vmd."invoiceCandidateId"
      LEFT JOIN "VendorLedger" vl ON vmd."selectedVendorLedgerId" = vl.id
      LEFT JOIN "VendorBranch" vb ON vl."vendorBranchId" = vb.id
      ${whereClause}
    `;

    const result = await this.prisma.$queryRaw<Array<any>>(query);

    const row = result[0];
    const totalProcessed = Number(row.totalProcessed) || 0;
    const legacyMatches = Number(row.legacyMatches) || 0;
    const vmmsMatches = Number(row.vmmsMatches) || 0;
    const agreements = Number(row.agreements) || 0;
    const disagreements = Number(row.disagreements) || 0;
    const stage1Matches = Number(row.stage1Matches) || 0;
    const stage2Matches = Number(row.stage2Matches) || 0;
    const manualReviews = Number(row.manualReviews) || 0;

    // Averages (using safe division to avoid NaN)
    const agreementRate =
      legacyMatches > 0 || vmmsMatches > 0
        ? (agreements / Math.max(legacyMatches, vmmsMatches)) * 100
        : 0;

    const disagreementRate =
      legacyMatches > 0 || vmmsMatches > 0
        ? (disagreements / Math.max(legacyMatches, vmmsMatches)) * 100
        : 0;

    const stage1MatchRate =
      totalProcessed > 0 ? (stage1Matches / totalProcessed) * 100 : 0;
    const stage2MatchRate =
      totalProcessed > 0 ? (stage2Matches / totalProcessed) * 100 : 0;
    const manualReviewRate =
      vmmsMatches > 0 ? (manualReviews / vmmsMatches) * 100 : 0;
    const dualWriteRate =
      totalProcessed > 0 ? (vmmsMatches / totalProcessed) * 100 : 0;

    return {
      timestamp: new Date(),
      totalProcessed,
      legacyMatches,
      vmmsMatches,
      agreementRate,
      disagreementRate,
      stage1MatchRate,
      stage2MatchRate,
      manualReviewRate,
      dualWriteRate,
      shadowFailures: 0, // Latency and shadow failures are best captured via operational metrics (e.g. Datadog), fallback to 0 for DB-based snapshot.
      averageLatencyMs: 0,
      p95LatencyMs: 0,
    };
  }

  public async getMismatchesCursor(
    limit: number,
    cursor?: string,
    companyId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ data: any[]; hasNextPage: boolean; nextCursor: string | null }> {
    // For Prisma to compare two joined fields efficiently, a raw query is required.
    // A mismatch is defined where InvoiceCandidate has a Document.vendorMatch.vendorId
    // that differs from VendorMatchDecision.selectedVendorLedger.vendorBranch.vendorId
    // OR one matched and the other didn't.

    let whereClause = Prisma.sql`
      WHERE (
        (vm."vendorId" IS DISTINCT FROM vb."vendorId")
        OR (vmd."matchEvidence"->>'requiresManualReview' = 'true')
      )
    `;

    if (companyId) {
      whereClause = Prisma.sql`${whereClause} AND d."companyId" = ${companyId}::uuid`;
    }

    if (startDate) {
      whereClause = Prisma.sql`${whereClause} AND ic."createdAt" >= ${startDate}`;
    }

    if (endDate) {
      whereClause = Prisma.sql`${whereClause} AND ic."createdAt" <= ${endDate}`;
    }

    if (cursor) {
      whereClause = Prisma.sql`${whereClause} AND ic.id > ${cursor}`;
    }

    const queryLimit = limit + 1;

    const query = Prisma.sql`
      SELECT ic.id
      FROM "InvoiceCandidate" ic
      LEFT JOIN "Document" d ON ic."documentId" = d.id
      LEFT JOIN "VendorMatch" vm ON d.id = vm."documentId"
      LEFT JOIN "VendorMatchDecision" vmd ON ic.id = vmd."invoiceCandidateId"
      LEFT JOIN "VendorLedger" vl ON vmd."selectedVendorLedgerId" = vl.id
      LEFT JOIN "VendorBranch" vb ON vl."vendorBranchId" = vb.id
      ${whereClause}
      ORDER BY ic.id ASC LIMIT ${queryLimit}
    `;

    const rawIds: Array<{ id: string }> = await this.prisma.$queryRaw(query);

    const hasNextPage = rawIds.length > limit;
    const paginatedIds = hasNextPage ? rawIds.slice(0, -1) : rawIds;
    const nextCursor = hasNextPage
      ? paginatedIds[paginatedIds.length - 1].id
      : null;

    if (paginatedIds.length === 0) {
      return { data: [], hasNextPage: false, nextCursor: null };
    }

    // Now fetch the rich objects for only the mismatched IDs
    const invoices = await this.prisma.invoiceCandidate.findMany({
      where: { id: { in: paginatedIds.map((r) => r.id) } },
      orderBy: { id: 'asc' },
      include: {
        document: {
          include: { vendorMatch: { include: { vendor: true } } },
        },
        matchDecision: {
          include: {
            selectedVendorLedger: {
              include: {
                vendorBranch: { include: { vendor: true } },
              },
            },
          },
        },
      },
    });

    return {
      data: invoices,
      hasNextPage,
      nextCursor,
    };
  }
}
