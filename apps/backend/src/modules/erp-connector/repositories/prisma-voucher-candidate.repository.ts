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

    const lines: TallyLedgerEntryDTO[] = candidate.entries.map((entry) => ({
      ledgerName: entry.ledgerName,
      isDebit: entry.isDebit,
      isParty: entry.isParty,
      amount: entry.amount.toNumber(),
    }));

    return {
      companyName: candidate.company?.name || 'Unknown Company',
      voucherNumber: candidate.voucherNumber,
      voucherType: candidate.voucherType,
      date: candidate.date.toISOString().split('T')[0].replace(/-/g, ''), // YYYYMMDD
      partyLedgerName: candidate.partyLedgerName || '',
      isEdit: candidate.isEdit,
      lines,
    };
  }
}
