import {
  IMatchingRule,
  RuleEvaluationResult,
} from '../interfaces/matching.interfaces';

export abstract class BaseMatchingRule implements IMatchingRule {
  abstract name: string;
  abstract weight: number;

  abstract evaluate(paymentCandidate: any): Promise<RuleEvaluationResult>;
}
