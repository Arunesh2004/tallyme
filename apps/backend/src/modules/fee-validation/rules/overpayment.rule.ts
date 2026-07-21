import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from './base.rule';
import { RuleValidationResult } from '../interfaces/validation.interfaces';

@Injectable()
export class OverpaymentRule extends BaseValidationRule {
  name = 'OverpaymentRule';

  async evaluate(
    paymentData: any,
    studentProfile: any,
  ): Promise<RuleValidationResult> {
    if (paymentData.amount < 0) {
      return {
        ruleName: this.name,
        isValid: false,
        statusModifier: 'INVALID',
        warnings: ['Payment amount cannot be negative'],
      };
    }

    if (paymentData.amount === 0) {
      return {
        ruleName: this.name,
        isValid: false,
        statusModifier: 'INVALID',
        warnings: ['Payment amount cannot be zero'],
      };
    }

    const totalOutstanding = studentProfile.outstandings
      .filter((o: any) => !o.isPaid)
      .reduce((sum: number, o: any) => sum + (Number(o.amount) - Number(o.amountPaid || 0)), 0);

    if (paymentData.amount > totalOutstanding) {
      return {
        ruleName: this.name,
        isValid: true,
        statusModifier: 'OVERPAYMENT',
        warnings: ['Payment amount exceeds total outstanding dues'],
      };
    }

    return {
      ruleName: this.name,
      isValid: true,
      warnings: [],
    };
  }
}
