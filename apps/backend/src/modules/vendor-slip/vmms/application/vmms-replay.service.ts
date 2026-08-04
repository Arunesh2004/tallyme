import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { VmmsVendorMatcher } from '../domain/services/vmms-matcher.service';
import { VmmsEvidenceBuilder } from '../domain/services/vmms-evidence-builder';
import { ReplayResult } from '../domain/models/replay-result';

@Injectable()
export class VmmsReplayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matcher: VmmsVendorMatcher,
    private readonly evidenceBuilder: VmmsEvidenceBuilder,
  ) {}

  public async replayInvoice(
    invoiceCandidateId: string,
  ): Promise<ReplayResult> {
    const invoice = await this.prisma.invoiceCandidate.findUnique({
      where: { id: invoiceCandidateId },
      include: {
        document: true,
        matchDecision: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(
        `InvoiceCandidate ${invoiceCandidateId} not found`,
      );
    }

    if (!invoice.document?.companyId) {
      throw new Error(
        `InvoiceCandidate ${invoiceCandidateId} has no associated company`,
      );
    }

    const companyId = invoice.document.companyId;
    const extractedGstin = invoice.extractedGstin;
    const historicalDecision = invoice.matchDecision;

    // Simulate Match
    const matchResult = await this.matcher.match(companyId, extractedGstin);

    // Build Evidence
    const simulatedEvidence = this.evidenceBuilder.build({
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

    // Determine Outcome
    const simulatedLedgerId = matchResult.vendorLedgerId;
    const historicalLedgerId =
      historicalDecision?.selectedVendorLedgerId || null;

    let diffStatus = 'IDENTICAL';
    if (simulatedLedgerId === historicalLedgerId) {
      if (
        matchResult.requiresManualReview !==
        ((historicalDecision?.matchEvidence as any)?.requiresManualReview ||
          false)
      ) {
        diffStatus = matchResult.requiresManualReview ? 'DEGRADED' : 'IMPROVED';
      }
    } else {
      if (!historicalLedgerId && simulatedLedgerId) {
        diffStatus = 'IMPROVED';
      } else if (historicalLedgerId && !simulatedLedgerId) {
        diffStatus = 'DEGRADED';
      } else {
        diffStatus = 'CHANGED';
      }
    }

    return {
      invoiceCandidateId,
      originalDecision: {
        stage: (historicalDecision?.matchEvidence as any)?.matchStage || 'NONE',
        vendorLedgerId: historicalLedgerId,
        confidence: (historicalDecision?.matchEvidence as any)?.confidence || 0,
      },
      simulatedDecision: {
        stage: matchResult.stage || 'NONE',
        vendorLedgerId: simulatedLedgerId,
        confidence: matchResult.confidence || 0,
      },
      diffStatus,
    };
  }
}
