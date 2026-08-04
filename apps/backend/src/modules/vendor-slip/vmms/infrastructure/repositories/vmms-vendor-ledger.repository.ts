import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { VendorLedgerDomain } from './vmms-repository.types';

@Injectable()
export class VmmsVendorLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string): Promise<VendorLedgerDomain | null> {
    const ledger = await this.prisma.vendorLedger.findUnique({
      where: { id },
      select: {
        id: true,
        vendorBranchId: true,
        companyId: true,
        erpLedgerCode: true,
        status: true,
        defaultExpenseCategory: true,
      },
    });

    if (!ledger) return null;
    return this.mapToDomain(ledger);
  }

  public async findByBranchId(
    vendorBranchId: string,
  ): Promise<VendorLedgerDomain[]> {
    const ledgers = await this.prisma.vendorLedger.findMany({
      where: { vendorBranchId },
      select: {
        id: true,
        vendorBranchId: true,
        companyId: true,
        erpLedgerCode: true,
        status: true,
        defaultExpenseCategory: true,
      },
    });

    return ledgers.map((l: any) => this.mapToDomain(l));
  }

  private mapToDomain(prismaModel: any): VendorLedgerDomain {
    return {
      id: prismaModel.id,
      vendorBranchId: prismaModel.vendorBranchId,
      companyId: prismaModel.companyId,
      erpLedgerCode: prismaModel.erpLedgerCode,
      status: prismaModel.status,
      defaultExpenseCategory: prismaModel.defaultExpenseCategory,
    };
  }
}
