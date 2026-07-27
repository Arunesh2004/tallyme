import { Injectable } from '@nestjs/common';
import {
  IAccountingRulesEngine,
  RuleEvaluationResult,
} from './accounting-rules-engine.interface';
import {
  AccountingTransaction,
  TransactionType,
} from '../../../shared/domain/accounting-transaction';

export interface AccountingRuleDecision {
  voucherType: string;
  requiresApproval: boolean;
  confidence: number;
  appliedRules: string[];
  explanation: string;
}

@Injectable()
export class AccountingRulesEngine implements IAccountingRulesEngine {
  async evaluateTransaction(
    transaction: AccountingTransaction,
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    if (transaction.amount > 100000) {
      results.push({
        passed: false,
        ruleName: 'HIGH_VALUE_TRANSACTION',
        reason: 'Amount exceeds 100,000 limit requiring approval',
      });
    } else {
      results.push({
        passed: true,
        ruleName: 'HIGH_VALUE_TRANSACTION',
        reason: 'Amount is within limits',
      });
    }

    const hasUnknownLedgers = transaction.lineItems.some(
      (li) => li.ledgerName === 'UNKNOWN_LEDGER',
    );
    if (hasUnknownLedgers) {
      results.push({
        passed: false,
        ruleName: 'KNOWN_LEDGERS_ONLY',
        reason: 'Contains UNKNOWN_LEDGER',
      });
    } else {
      results.push({
        passed: true,
        ruleName: 'KNOWN_LEDGERS_ONLY',
        reason: 'All ledgers resolved successfully',
      });
    }

    return results;
  }

  async classifyTransactionType(input: any): Promise<string> {
    return 'PURCHASE';
  }

  async determineApprovalRouting(
    transaction: AccountingTransaction,
  ): Promise<string[]> {
    const evals = await this.evaluateTransaction(transaction);
    const failures = evals.filter((e) => !e.passed);
    return failures.length > 0 ? ['FINANCE_MANAGER_APPROVAL'] : [];
  }

  async evaluate(
    transaction: AccountingTransaction,
  ): Promise<AccountingRuleDecision> {
    const evals = await this.evaluateTransaction(transaction);
    const requiresApproval = evals.some((e) => !e.passed);
    const voucherType =
      transaction.transactionType === TransactionType.PURCHASE
        ? 'PURCHASE'
        : transaction.transactionType === TransactionType.RECEIPT
          ? 'RECEIPT'
          : 'JOURNAL';

    return {
      voucherType,
      requiresApproval,
      confidence: requiresApproval ? 0.7 : 0.95,
      appliedRules: evals.map((e) => e.ruleName),
      explanation: requiresApproval
        ? `Requires manual review: ${evals
            .filter((e) => !e.passed)
            .map((e) => e.reason)
            .join(', ')}`
        : 'All rules passed successfully',
    };
  }
}
