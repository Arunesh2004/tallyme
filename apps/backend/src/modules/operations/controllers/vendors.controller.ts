import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('operations/vendors')
export class VendorsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getVendors(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
    @Query('gstin') gstin?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null };

    if (gstin) {
      where.gstin = { contains: gstin, mode: 'insensitive' };
    } else if (search) {
      // Priority: GSTIN -> Name -> VendorCode
      where.OR = [
        { gstin: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          vendorMatches: {
            take: 1,
            orderBy: { matchedAt: 'desc' },
            include: { document: true },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    const data = vendors.map((v) => ({
      id: v.id,
      vendorCode: v.vendorCode,
      name: v.name,
      gstin: v.gstin,
      pan: v.pan,
      ledgerMapping: {
        defaultLedger: 'Sundry Creditors', // Placeholder as requested
      },
      transactionHistory: {
        totalTransactions: v.vendorMatches.length,
        lastTransactionDate: v.vendorMatches[0]?.matchedAt || null,
      },
      syncStatus: 'SYNCED',
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
  async getVendor(@Param('id') id: string) {
    const v = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        vendorMatches: {
          include: { document: true },
        },
      },
    });

    if (!v) return null;

    return {
      id: v.id,
      vendorCode: v.vendorCode,
      name: v.name,
      gstin: v.gstin,
      pan: v.pan,
      ledgerMapping: {
        defaultLedger: 'Sundry Creditors',
      },
      transactionHistory: {
        totalTransactions: v.vendorMatches.length,
        lastTransactionDate: v.vendorMatches[0]?.matchedAt || null,
        recentMatches: v.vendorMatches.slice(0, 5),
      },
      syncStatus: 'SYNCED',
    };
  }
}
