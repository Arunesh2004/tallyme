import {
  IFeeValidationRule,
  RuleValidationResult,
} from '../interfaces/validation.interfaces';

export abstract class BaseValidationRule implements IFeeValidationRule {
  abstract name: string;

  abstract evaluate(
    paymentData: any,
    studentProfile: any,
  ): Promise<RuleValidationResult>;
}
