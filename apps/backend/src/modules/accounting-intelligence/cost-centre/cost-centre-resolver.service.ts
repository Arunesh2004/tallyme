import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CostCentreDecision {
  selectedCostCentre: string;
  confidence: number;
  reason: string;
  source: string;
}

@Injectable()
export class CostCentreResolverService {
  private readonly logger = new Logger(CostCentreResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveCostCentre(
    entityName: string,
    category: string,
  ): Promise<CostCentreDecision> {
    // Basic rules to find a cost centre. In a real system, would match against TallyMaster templates.
    this.logger.log(
      `Resolving cost centre for ${entityName} in category ${category}`,
    );

    // If it's a student, cost centre is usually the Class
    if (category === 'CLASS') {
      return {
        selectedCostCentre: entityName, // e.g., 'Class 10 A'
        confidence: 90,
        reason: 'Matched class category for student fee.',
        source: 'CostCentreResolver',
      };
    }

    // Default fallback
    return {
      selectedCostCentre: 'General',
      confidence: 50,
      reason: 'Fallback cost centre chosen.',
      source: 'CostCentreResolver',
    };
  }
}
