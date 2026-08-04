import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { VendorBranchDomain } from './vmms-repository.types';

@Injectable()
export class VmmsVendorBranchRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: string): Promise<VendorBranchDomain | null> {
    const branch = await this.prisma.vendorBranch.findUnique({
      where: { id },
      select: {
        id: true,
        vendorId: true,
        companyId: true,
        gstin: true,
        status: true,
      },
    });

    if (!branch) return null;
    return this.mapToDomain(branch);
  }

  public async findByExactGstin(
    companyId: string,
    gstin: string,
  ): Promise<VendorBranchDomain | null> {
    const branch = await this.prisma.vendorBranch.findUnique({
      where: {
        companyId_gstin: {
          companyId,
          gstin,
        },
      },
      select: {
        id: true,
        vendorId: true,
        companyId: true,
        gstin: true,
        status: true,
      },
    });

    if (!branch) return null;
    return this.mapToDomain(branch);
  }

  public async findByNormalizedGstin(
    companyId: string,
    normalizedGstin: string,
  ): Promise<VendorBranchDomain | null> {
    // Exact match on normalized GSTIN is the same query on the DB since normalization happened in memory.
    const branch = await this.prisma.vendorBranch.findUnique({
      where: {
        companyId_gstin: {
          companyId,
          gstin: normalizedGstin,
        },
      },
      select: {
        id: true,
        vendorId: true,
        companyId: true,
        gstin: true,
        status: true,
      },
    });

    if (!branch) return null;
    return this.mapToDomain(branch);
  }

  private mapToDomain(prismaModel: any): VendorBranchDomain {
    return {
      id: prismaModel.id,
      vendorId: prismaModel.vendorId,
      companyId: prismaModel.companyId,
      gstin: prismaModel.gstin,
      status: prismaModel.status,
    };
  }
}
