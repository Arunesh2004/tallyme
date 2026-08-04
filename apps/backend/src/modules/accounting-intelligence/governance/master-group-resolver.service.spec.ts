import { Test, TestingModule } from '@nestjs/testing';
import { MasterGroupResolverService } from './master-group-resolver.service';

describe('MasterGroupResolverService', () => {
  let service: MasterGroupResolverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MasterGroupResolverService],
    }).compile();
    service = module.get<MasterGroupResolverService>(MasterGroupResolverService);
  });

  describe('resolvePartyGroup', () => {
    it('should resolve VENDOR to Sundry Creditors', () => {
      const result = service.resolvePartyGroup({ id: 'p-1', type: 'VENDOR', ledgerName: 'Acme' });
      expect(result.parentGroup).toBe('Sundry Creditors');
      expect(result.confidence).toBe(1.0);
    });

    it('should resolve STUDENT to Sundry Debtors', () => {
      const result = service.resolvePartyGroup({ id: 'p-1', type: 'STUDENT', ledgerName: 'John' });
      expect(result.parentGroup).toBe('Sundry Debtors');
      expect(result.confidence).toBe(1.0);
    });

    it('should resolve EMPLOYEE to Sundry Creditors with lower confidence', () => {
      const result = service.resolvePartyGroup({ id: 'p-1', type: 'EMPLOYEE', ledgerName: 'Jane' });
      expect(result.parentGroup).toBe('Sundry Creditors');
      expect(result.confidence).toBe(0.8);
    });

    it('should return empty parentGroup for unknown type', () => {
      const result = service.resolvePartyGroup({ id: 'p-1', type: 'OTHER' as any, ledgerName: 'Entity' });
      expect(result.parentGroup).toBe('');
      expect(result.confidence).toBe(0.0);
    });
  });

  describe('resolveExpenseGroup', () => {
    it('should reject low confidence line items', () => {
      const lineItem: any = { id: 'l-1', ledgerName: 'Expense', amount: 100, isDebit: true, confidence: { confidence: 0.5 } };
      const result = service.resolveExpenseGroup(lineItem, false);
      expect(result.parentGroup).toBe('');
      expect(result.confidence).toBe(0.5);
    });

    it('should return Indirect Expenses for purchase transactions', () => {
      const lineItem: any = { id: 'l-1', ledgerName: 'Expense', amount: 100, isDebit: false };
      const result = service.resolveExpenseGroup(lineItem, true);
      expect(result.parentGroup).toBe('Indirect Expenses');
    });

    it('should return Indirect Expenses for debit line items', () => {
      const lineItem: any = { id: 'l-1', ledgerName: 'Expense', amount: 100, isDebit: true };
      const result = service.resolveExpenseGroup(lineItem, false);
      expect(result.parentGroup).toBe('Indirect Expenses');
    });

    it('should return Indirect Incomes for credit non-purchase items', () => {
      const lineItem: any = { id: 'l-1', ledgerName: 'Income', amount: 100, isDebit: false };
      const result = service.resolveExpenseGroup(lineItem, false);
      expect(result.parentGroup).toBe('Indirect Incomes');
    });
  });

  describe('resolveTaxGroup', () => {
    it('should always return Duties & Taxes', () => {
      const result = service.resolveTaxGroup({ id: 't-1', ledgerName: 'CGST', amount: 18, taxType: 'CGST' } as any);
      expect(result.parentGroup).toBe('Duties & Taxes');
      expect(result.confidence).toBe(1.0);
    });
  });
});
