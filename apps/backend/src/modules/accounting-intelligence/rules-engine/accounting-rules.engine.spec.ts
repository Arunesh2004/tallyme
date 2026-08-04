import { Test, TestingModule } from '@nestjs/testing';
import { AccountingRulesEngine } from './accounting-rules.engine';
import { AccountingTransaction, TransactionType } from '../../../shared/domain/accounting-transaction';

describe('AccountingRulesEngine', () => {
  let engine: AccountingRulesEngine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountingRulesEngine],
    }).compile();

    engine = module.get<AccountingRulesEngine>(AccountingRulesEngine);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  const createBaseTransaction = (amount: number, ledgers: string[], type: TransactionType): AccountingTransaction => {
    return {
      id: 'tx-1',
      amount,
      transactionType: type,
      lineItems: ledgers.map(l => ({
        ledgerName: l,
        ledgerType: 'EXPENSE',
        amount,
        dcIndicator: 'DEBIT'
      }))
    } as any as AccountingTransaction;
  };

  describe('evaluateTransaction', () => {
    it('should fail HIGH_VALUE_TRANSACTION rule if amount > 100000', async () => {
      const tx = createBaseTransaction(150000, ['Valid Ledger'], TransactionType.PURCHASE);
      const result = await engine.evaluateTransaction(tx);
      const highValueRule = result.find(r => r.ruleName === 'HIGH_VALUE_TRANSACTION');
      expect(highValueRule?.passed).toBe(false);
    });

    it('should pass HIGH_VALUE_TRANSACTION rule if amount <= 100000', async () => {
      const tx = createBaseTransaction(50000, ['Valid Ledger'], TransactionType.PURCHASE);
      const result = await engine.evaluateTransaction(tx);
      const highValueRule = result.find(r => r.ruleName === 'HIGH_VALUE_TRANSACTION');
      expect(highValueRule?.passed).toBe(true);
    });

    it('should fail KNOWN_LEDGERS_ONLY rule if contains UNKNOWN_LEDGER', async () => {
      const tx = createBaseTransaction(50000, ['UNKNOWN_LEDGER'], TransactionType.PURCHASE);
      const result = await engine.evaluateTransaction(tx);
      const ledgerRule = result.find(r => r.ruleName === 'KNOWN_LEDGERS_ONLY');
      expect(ledgerRule?.passed).toBe(false);
    });
  });

  describe('classifyTransactionType', () => {
    it('should classify as PURCHASE', async () => {
      const result = await engine.classifyTransactionType({});
      expect(result).toBe('PURCHASE');
    });
  });

  describe('determineApprovalRouting', () => {
    it('should require FINANCE_MANAGER_APPROVAL if rules fail', async () => {
      const tx = createBaseTransaction(150000, ['UNKNOWN_LEDGER'], TransactionType.PURCHASE);
      const result = await engine.determineApprovalRouting(tx);
      expect(result).toContain('FINANCE_MANAGER_APPROVAL');
    });

    it('should not require routing if rules pass', async () => {
      const tx = createBaseTransaction(50000, ['Valid Ledger'], TransactionType.PURCHASE);
      const result = await engine.determineApprovalRouting(tx);
      expect(result).toHaveLength(0);
    });
  });

  describe('evaluate', () => {
    it('should require approval for failed rules and map voucher type', async () => {
      const tx = createBaseTransaction(150000, ['Valid Ledger'], TransactionType.RECEIPT);
      const result = await engine.evaluate(tx);
      
      expect(result.requiresApproval).toBe(true);
      expect(result.confidence).toBe(0.7);
      expect(result.voucherType).toBe('RECEIPT');
      expect(result.explanation).toContain('Amount exceeds 100,000 limit');
    });

    it('should pass if all rules pass and map JOURNAL for unknown type', async () => {
      const tx = createBaseTransaction(50000, ['Valid Ledger'], 'UNKNOWN' as TransactionType);
      const result = await engine.evaluate(tx);
      
      expect(result.requiresApproval).toBe(false);
      expect(result.confidence).toBe(0.95);
      expect(result.voucherType).toBe('JOURNAL');
      expect(result.explanation).toBe('All rules passed successfully');
    });
  });
});
