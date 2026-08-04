import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CompanyIntelligenceProfile } from '../../universal-transaction/domain/readiness.types';

@Injectable()
export class CompanyIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(companyId: string): Promise<CompanyIntelligenceProfile> {
    // Determine company features via TallyConnectionConfig or other config markers
    // Since the database might not have direct booleans, we will derive it from available sync features or defaults
    const config = await this.prisma.tallyConnectionConfig.findFirst({
      where: { companyName: companyId }, // using companyName or organizationId based on schema
    });

    const isBillWiseEnabled = config?.isActive || true; // Stub heuristic
    const isCostCentreEnabled = config?.isActive || true; 
    const isProjectTrackingEnabled = false; // Add specific lookups here
    const isInventoryTrackingEnabled = false;

    return {
      isBillWiseEnabled,
      isCostCentreEnabled,
      isProjectTrackingEnabled,
      isInventoryTrackingEnabled,
      gstRules: { enabled: true },
      branchRules: { enabled: false },
    };
  }
}
