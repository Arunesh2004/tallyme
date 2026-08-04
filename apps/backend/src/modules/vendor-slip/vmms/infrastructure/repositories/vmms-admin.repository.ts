import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { MismatchVerdictType } from '../../api/dto/vmms-admin.dto';

@Injectable()
export class VmmsAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async resolveMismatch(
    invoiceCandidateId: string,
    verdict: MismatchVerdictType,
    notes: string | undefined,
    proposedAlias: string | undefined,
    userId: string,
  ): Promise<void> {
    const invoice = await this.prisma.invoiceCandidate.findUnique({
      where: { id: invoiceCandidateId },
      include: {
        document: true,
        matchDecision: {
          include: {
            selectedVendorLedger: {
              include: { vendorBranch: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(
        `InvoiceCandidate ${invoiceCandidateId} not found`,
      );
    }

    if (!invoice.matchDecision) {
      throw new Error(
        `InvoiceCandidate ${invoiceCandidateId} has no shadow match decision to resolve`,
      );
    }

    const companyId = invoice.document.companyId;
    const vendorId =
      invoice.matchDecision.selectedVendorLedger.vendorBranch.vendorId;

    if (!companyId) {
      throw new Error(
        `InvoiceCandidate ${invoiceCandidateId} lacks a companyId`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Update the match decision to mark it resolved
      await tx.vendorMatchDecision.update({
        where: { id: invoice.matchDecision!.id },
        data: {
          resolvedByUserId: userId,
          updatedAt: new Date(),
        },
      });

      // Insert audit log
      await tx.vendorAudit.create({
        data: {
          companyId,
          vendorId,
          changeType: 'MISMATCH_RESOLVED',
          createdBy: userId,
          newPayload: { verdict, notes, proposedAlias, invoiceCandidateId },
        },
      });
    });
  }

  public async createAlias(
    vendorLedgerId: string,
    aliasText: string,
    invoiceIdContext: string | undefined,
    userId: string,
  ): Promise<any> {
    const ledger = await this.prisma.vendorLedger.findUnique({
      where: { id: vendorLedgerId },
      include: { vendorBranch: true },
    });

    if (!ledger) {
      throw new NotFoundException(`VendorLedger ${vendorLedgerId} not found`);
    }

    return await this.prisma.$transaction(async (tx) => {
      const alias = await tx.vendorAlias.create({
        data: {
          companyId: ledger.companyId,
          vendorLedgerId,
          aliasText: aliasText.toUpperCase().trim(),
          normalizationType: 'EXACT',
          isSystemGenerated: false,
          status: 'APPROVED',
          approvedBy: userId,
          approvedAt: new Date(),
          effectiveFrom: new Date(),
        },
      });

      await tx.vendorAudit.create({
        data: {
          companyId: ledger.companyId,
          vendorId: ledger.vendorBranch.vendorId,
          vendorBranchId: ledger.vendorBranchId,
          changeType: 'ALIAS_CREATED',
          createdBy: userId,
          newPayload: {
            aliasId: alias.id,
            aliasText: alias.aliasText,
            invoiceIdContext,
          },
        },
      });

      return alias;
    });
  }
}
