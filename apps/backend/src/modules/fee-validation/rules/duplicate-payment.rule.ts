import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from './base.rule';
import { RuleValidationResult } from '../interfaces/validation.interfaces';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class DuplicatePaymentRule extends BaseValidationRule {
  name = 'DuplicatePaymentRule';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async evaluate(
    paymentData: any,
    studentProfile: any,
  ): Promise<RuleValidationResult> {
    if (!paymentData.transactionId && !paymentData.utr) {
      return {
        ruleName: this.name,
        isValid: true,
        warnings: [],
      };
    }

    const duplicateCandidate = await this.prisma.feeAllocationCandidate.findFirst({
      where: {
        studentPaymentCandidate: {
          paymentCandidate: {
            OR: [
              { transactionId: paymentData.transactionId || undefined },
              { utr: paymentData.utr || undefined },
            ],
            gateway: paymentData.gateway || undefined,
          }
        },
        validationStatus: {
          not: 'INVALID'
        }
      }
    });

    if (duplicateCandidate) {
      return {
        ruleName: this.name,
        isValid: false,
        isDuplicate: true,
        statusModifier: 'DUPLICATE_PAYMENT',
        warnings: ['Suspected duplicate payment transaction detected based on existing allocation'],
      };
    }

    return {
      ruleName: this.name,
      isValid: true,
      warnings: [],
    };
  }
}
