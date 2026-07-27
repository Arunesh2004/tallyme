import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('accounting-intelligence/decisions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DecisionAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ACCOUNTING_ADMIN', 'AUDITOR', 'VIEW_ONLY')
  async getDecisions() {
    return this.prisma.accountingDecisionLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }

  @Get(':id')
  @Roles('ACCOUNTING_ADMIN', 'AUDITOR', 'VIEW_ONLY')
  async getDecisionById(@Param('id') id: string) {
    const decision = await this.prisma.accountingDecisionLog.findUnique({
      where: { id },
    });

    if (!decision) {
      throw new Error('Decision not found');
    }

    // Enhance the return payload for explorer view
    return {
      id: decision.id,
      timestamp: decision.timestamp,
      transactionContext: decision.inputData,
      decision:  {
        ledgerSelected:
          (decision.ledgerDecision as any)?.ledgerName || 'UNKNOWN',
        reason: (decision.ledgerDecision as any)?.reason || 'N/A',
        confidence: decision.confidence,
        appliedRules: decision.appliedRules,
        userOverride: decision.userOverride,
      },
      raw: decision,
    };
  }
}
