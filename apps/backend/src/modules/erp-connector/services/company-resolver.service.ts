import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TallyDiscoveryAdapter } from './tally-discovery.adapter';

export interface ICompanyResolver {
  resolveCompanyName(companyId?: string): Promise<string>;
}

@Injectable()
export class ConfigCompanyResolver implements ICompanyResolver {
  private readonly logger = new Logger(ConfigCompanyResolver.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly erpAdapter: TallyDiscoveryAdapter,
  ) {}

  async resolveCompanyName(companyId?: string): Promise<string> {
    if (!companyId) {
      const configCompany =
        this.configService.get<string>('TALLY_COMPANY_NAME');
      if (configCompany) return configCompany;
      throw new Error(
        'No company ID provided and no global TALLY_COMPANY_NAME found',
      );
    }

    // 1. Get Discovered Companies
    let discovered = await this.prisma.tallyCompanyDiscovery.findMany({
      where: { connectionId: companyId, active: true },
      orderBy: { createdAt: 'desc' },
    });

    const isStale =
      discovered.length === 0 ||
      new Date().getTime() - discovered[0].createdAt.getTime() > 1000 * 60 * 60;

    if (isStale) {
      this.logger.log(
        `Discovery cache stale for company ${companyId}. Refreshing...`,
      );
      const freshCompanies = await this.erpAdapter.fetchCompanies();
      if (freshCompanies && freshCompanies.length > 0) {
        await this.prisma.tallyCompanyDiscovery.deleteMany({
          where: { connectionId: companyId },
        });
        await this.prisma.tallyCompanyDiscovery.createMany({
          data: freshCompanies.map((c) => ({
            connectionId: companyId,
            companyName: c.name,
            active: true,
          })),
        });
        discovered = await this.prisma.tallyCompanyDiscovery.findMany({
          where: { connectionId: companyId, active: true },
        });
      }
    }

    // 2. If exactly one company exists, use it
    if (discovered.length === 1) {
      return discovered[0].companyName;
    }

    // 3. If multiple exist, check mapping
    if (discovered.length > 1) {
      const mapping = await this.prisma.tallyMasterMapping.findFirst({
        where: { companyId, entityType: 'COMPANY' },
      });

      if (mapping) {
        const matchingCompany = discovered.find(
          (c) =>
            c.companyName === mapping.tallyName ||
            c.companyGuid === mapping.tallyGuid,
        );
        if (matchingCompany) {
          return matchingCompany.companyName;
        }

        // Refresh one more time if missing
        this.logger.log(`Mapped company missing. Forcing refresh...`);
        const freshCompanies = await this.erpAdapter.fetchCompanies();
        if (freshCompanies && freshCompanies.length > 0) {
          await this.prisma.tallyCompanyDiscovery.deleteMany({
            where: { connectionId: companyId },
          });
          await this.prisma.tallyCompanyDiscovery.createMany({
            data: freshCompanies.map((c) => ({
              connectionId: companyId,
              companyName: c.name,
              active: true,
            })),
          });
          discovered = await this.prisma.tallyCompanyDiscovery.findMany({
            where: { connectionId: companyId, active: true },
          });

          const matchingAfterRefresh = discovered.find(
            (c) =>
              c.companyName === mapping.tallyName ||
              c.companyGuid === mapping.tallyGuid,
          );
          if (matchingAfterRefresh) {
            return matchingAfterRefresh.companyName;
          }
        }

        throw new Error(
          `Mapped company ${mapping.tallyName} not found in recent discovery. Discovery refresh required.`,
        );
      }

      throw new Error(
        `Multiple Tally companies discovered but no mapping found. Company selection required.`,
      );
    }

    // 4. If none discovered
    throw new Error(
      `No Tally companies discovered. Discovery refresh required.`,
    );
  }
}
