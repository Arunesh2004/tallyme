import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IVoucherCandidateRepository } from '../interfaces/voucher.interfaces';
import { TallyVoucherDTO, TallyLedgerEntryDTO } from '../dto/tally-voucher.dto';

@Injectable()
export class PrismaVoucherCandidateRepository implements IVoucherCandidateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TallyVoucherDTO | null> {
    const candidate = await this.prisma.voucherCandidate.findUnique({
      where: { id },
      include: {
        company: true,
        entries: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!candidate) {
      return null;
    }

    const metadata = (candidate.metadata as any) || {};
    const lineItemsMeta = metadata.lineItems || [];
    const taxesMeta = metadata.taxes || {};

    const lines: TallyLedgerEntryDTO[] = candidate.entries.map((entry) => {
      // Try to find corresponding line metadata (matching by description or sequence)
      const lineMeta =
        lineItemsMeta.find(
          (l: any) =>
            l.description === entry.ledgerName ||
            l.amount === entry.amount.toNumber(),
        ) || {};

      return {
        ledgerName: entry.ledgerName,
        isDebit: entry.isDebit,
        isParty: entry.isParty,
        amount: entry.amount.toNumber(),
        hsnCode: lineMeta.hsnSac,
        quantity: lineMeta.quantity,
        unit: lineMeta.unit,
        rate: lineMeta.rate,
      };
    });

    return {
      companyId: candidate.companyId || undefined,
      companyName: candidate.company?.name || 'Unknown Company',
      voucherNumber: candidate.voucherNumber,
      voucherType: candidate.voucherType,
      date: candidate.date.toISOString().split('T')[0].replace(/-/g, ''), // YYYYMMDD
      partyLedgerName: candidate.partyLedgerName || '',
      isEdit: candidate.isEdit,

      // Mapped from Metadata
      supplierGstin: metadata.gstin,
      supplierPan: metadata.pan,
      supplierState: metadata.state,
      placeOfSupply: metadata.placeOfSupply,
      invoiceNumber: metadata.invoiceNumber || metadata.voucherNumber,
      purchaseOrder: metadata.purchaseOrder,
      paymentTerms: metadata.paymentTerms,

      cgst: taxesMeta.cgst,
      sgst: taxesMeta.sgst,
      igst: taxesMeta.igst,
      cess: taxesMeta.cess,

      lines,
    };
  }
}
