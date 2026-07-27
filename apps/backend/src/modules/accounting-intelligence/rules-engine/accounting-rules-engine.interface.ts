import { LedgerDecision } from '../ledger-mapping/ledger-mapping.interface';
import { AccountingTransaction } from '../../../shared/domain/accounting-transaction';

export interface RuleEvaluationResult {
  passed: boolean;
  ruleName: string;
  reason: string;
}

export interface IAccountingRulesEngine {
  evaluateTransaction(
    transaction: AccountingTransaction,
  ): Promise<RuleEvaluationResult[]>;
  classifyTransactionType(input: any): Promise<string>;
  determineApprovalRouting(
    transaction: AccountingTransaction,
  ): Promise<string[]>;
}
