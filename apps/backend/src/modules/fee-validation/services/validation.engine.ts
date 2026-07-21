import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../rules/base.rule';
import { DuplicatePaymentRule } from '../rules/duplicate-payment.rule';
import { OverpaymentRule } from '../rules/overpayment.rule';
import { VALIDATION_RESULT_STATUS } from '../constants/validation.constants';

@Injectable()
export class FeeValidationEngine {
  private rules: BaseValidationRule[];

  constructor(
    duplicateRule: DuplicatePaymentRule,
    overpaymentRule: OverpaymentRule,
  ) {
    this.rules = [duplicateRule, overpaymentRule];
  }

  async validate(paymentData: any, studentProfile: any) {
    let status = VALIDATION_RESULT_STATUS.VALID;
    let requiresManualReview = false;
    let duplicateCandidate = false;
    const warnings: string[] = [];
    const rawData: any = { breakdown: [] };

    for (const rule of this.rules) {
      const result = await rule.evaluate(paymentData, studentProfile);
      rawData.breakdown.push(result);

      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }

      if (result.isDuplicate) {
        duplicateCandidate = true;
      }

      if (result.statusModifier) {
        // If it's worse, degrade the status. (Simple fallback hierarchy)
        if (result.statusModifier === 'DUPLICATE_PAYMENT')
          status = 'DUPLICATE_PAYMENT';
        else if (status === 'VALID') status = result.statusModifier;
      }

      if (!result.isValid) {
        requiresManualReview = true;
        if (status === 'VALID') status = 'INVALID';
      }
    }

    // Determine manual review from status
    if (
      status === 'DUPLICATE_PAYMENT' ||
      status === 'OVERPAYMENT' ||
      status === 'INVALID'
    ) {
      requiresManualReview = true;
      status = VALIDATION_RESULT_STATUS.MANUAL_REVIEW;
    }

    return {
      status,
      warnings,
      requiresManualReview,
      duplicateCandidate,
      rawValidationData: rawData,
    };
  }
}
