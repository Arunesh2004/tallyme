import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IVoucherCandidateRepository } from '../interfaces/voucher.interfaces';
import { TallyVoucherDTO, TallyVoucherLineDTO } from '../dto/tally-voucher.dto';

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

    const lines: TallyVoucherLineDTO[] = candidate.entries.map((entry) => ({
      ledgerName: entry.ledgerName,
      isDebit: entry.isDebit,
      isParty: entry.isParty,
      amount: entry.amount.toNumber(),
    }));

    return {
      id: candidate.id,
      companyId: candidate.companyId,
      companyName: candidate.company.name,
      voucherNumber: candidate.voucherNumber,
      voucherType: candidate.voucherType,
      date: candidate.date.toISOString().split('T')[0].replace(/-/g, ''), // YYYYMMDD
      partyLedgerName: candidate.partyLedgerName || '',
      isEdit: candidate.isEdit,
      lines,
    };
  }
}
