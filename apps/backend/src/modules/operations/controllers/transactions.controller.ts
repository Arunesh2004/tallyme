import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('operations/transactions')
export class TransactionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.voucherNumber = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }

    const [vouchers, total] = await Promise.all([
      this.prisma.voucherCandidate.findMany({
        where,
        skip,
        take: limitNum,
        include: { erpSyncJob: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.voucherCandidate.count({ where }),
    ]);

    // Map to the enterprise vision response
    const data = vouchers.map((v) => ({
      transactionId: v.id,
      voucherNumber: v.voucherNumber,
      date: v.date,
      type: v.voucherType,
      amount: 1000, // Placeholder, would compute from entries
      sourceDocument: {
        fileName: `DOC-${v.voucherNumber}.pdf`,
        uploadedAt: v.date,
      },
      extraction: {
        confidence: 0.95,
        status: 'AUTO_APPROVED',
      },
      accountingDecision: {
        ledger: v.partyLedgerName || 'Default Ledger',
        rule: 'CATEGORY_MAPPING',
      },
      voucher: {
        status: v.status,
      },
      erpSync: {
        status: v.erpSyncJob?.status || 'PENDING',
        lastAttempt: v.erpSyncJob?.lastAttemptAt,
      },
    }));

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    };
  }

  @Get(':id')
  async getTransaction(@Param('id') id: string) {
    const v = await this.prisma.voucherCandidate.findUnique({
      where: { id },
      include: { erpSyncJob: true, entries: true },
    });

    if (!v) {
      return null;
    }

    return {
      transactionId: v.id,
      voucherNumber: v.voucherNumber,
      date: v.date,
      type: v.voucherType,
      entries: v.entries,
      sourceDocument: {
        fileName: `DOC-${v.voucherNumber}.pdf`,
        uploadedAt: v.date,
      },
      extraction: {
        confidence: 0.95,
        status: 'AUTO_APPROVED',
      },
      accountingDecision: {
        ledger: v.partyLedgerName || 'Default Ledger',
        rule: 'CATEGORY_MAPPING',
      },
      voucher: {
        status: v.status,
      },
      erpSync: {
        status: v.erpSyncJob?.status || 'PENDING',
        lastAttempt: v.erpSyncJob?.lastAttemptAt,
        attempts: v.erpSyncJob?.attempts || 0,
      },
    };
  }
}
