import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TallyDiscoveryAdapter } from '../../erp-connector/services/tally-discovery.adapter';

export interface IERPDiscoveryAdapter {
  fetchCompanies(): Promise<any[]>;
  fetchGroups(): Promise<any[]>;
  fetchLedgers(): Promise<any[]>;
  fetchVoucherTypes(): Promise<any[]>;
  fetchCostCentres(): Promise<any[]>;
}

@Injectable()
export class TallyDiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly erpAdapter: TallyDiscoveryAdapter,
  ) {}

  async runDiscovery(companyId: string, userId: string): Promise<string> {
    try {
      const companies = await this.erpAdapter.fetchCompanies();
      const ledgersData = await this.erpAdapter.fetchLedgers();
      const groupsData = await this.erpAdapter.fetchGroups();
      const voucherTypesData = await this.erpAdapter.fetchVoucherTypes();
      const costCentresData = await this.erpAdapter.fetchCostCentres();

      // Update Company Discovery Cache
      await this.prisma.tallyCompanyDiscovery.deleteMany({
        where: { connectionId: companyId },
      });
      if (companies && companies.length > 0) {
        await this.prisma.tallyCompanyDiscovery.createMany({
          data: companies.map(c => ({
            connectionId: companyId,
            companyName: c.name,
            active: true
          }))
        });
      }

      const report = await this.prisma.tallyDiscoveryReport.create({
        data: {
          companyId,
          snapshotVersion: '1.0.0',
          createdBy: userId,
          status: 'COMPLETED',
          recommendations: { info: 'Discovery executed through ERPConnector' },
          groups: { create: groupsData.map((g) => ({ data: g })) },
          ledgers: { create: ledgersData.map((l) => ({ data: l })) },
          voucherTypes: { create: voucherTypesData.map((v) => ({ data: v })) },
          costCentres: { create: costCentresData.map((c) => ({ data: c })) },
        },
      });

      return report.id;
    } catch (error: any) {
      const report = await this.prisma.tallyDiscoveryReport.create({
        data: {
          companyId,
          snapshotVersion: '1.0.0',
          createdBy: userId,
          status: 'CONNECTION_FAILED',
          recommendations: { error: (error as Error).message },
          groups: { create: [] },
          ledgers: { create: [] },
          voucherTypes: { create: [] },
          costCentres: { create: [] },
        },
      });
      return report.id;
    }
  }
}
