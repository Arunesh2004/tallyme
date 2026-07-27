import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface DecisionLogPayload {
  companyId?: string;
  userId?: string;
  inputData?: any;
  resolverOutput?: any;
  appliedRules?: any;
  ledgerDecision?: any;
  confidence?: number;
  supportingEvidence?: string[];
  userOverride?: boolean;
}

@Injectable()
export class AccountingDecisionAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logDecision(payload: DecisionLogPayload): Promise<void> {
    await this.prisma.accountingDecisionLog.create({
      data: {
        companyId: payload.companyId,
        userId: payload.userId,
        inputData: payload.inputData
          ? JSON.parse(JSON.stringify(payload.inputData))
          : null,
        resolverOutput: payload.resolverOutput
          ? JSON.parse(JSON.stringify(payload.resolverOutput))
          : null,
        appliedRules: payload.appliedRules
          ? JSON.parse(JSON.stringify(payload.appliedRules))
          : null,
        ledgerDecision: payload.ledgerDecision
          ? JSON.parse(JSON.stringify(payload.ledgerDecision))
          : null,
        confidence: payload.confidence,
        supportingEvidence: payload.supportingEvidence
          ? JSON.parse(JSON.stringify(payload.supportingEvidence))
          : null,
        userOverride: payload.userOverride ?? false,
      },
    });
  }
}
