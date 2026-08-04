import { AccountingPolicyService } from './accounting-policy.service';
import { CanonicalAccountingModel } from '../../universal-transaction/domain/types';
import { TransactionIntent, ValidationSeverity } from '../../universal-transaction/domain/enums';

describe('AccountingPolicyService', () => {
  let service: AccountingPolicyService;

  beforeEach(() => {
    const mockPeriodService = {
      validatePostingAllowed: jest.fn().mockResolvedValue(undefined),
    } as any;
    service = new AccountingPolicyService(mockPeriodService);
  });

  const getValidPayload = (): CanonicalAccountingModel => ({
    header: {
      tenantId: 'tenant-1',
      transactionIntent: TransactionIntent.PURCHASE,
      companyId: 'comp-1',
      financialYear: '2023-2024',
      currency: 'INR',
      exchangeRate: '1.0',
      status: 'DRAFT'
    },
    parties: {},
    ledgerEntries: [
      { ledgerId: 'ledger-1', amount: '100.50', isDebit: true },
      { ledgerId: 'ledger-2', amount: '100.50', isDebit: false }
    ],
    metadata: { auditVersion: 1 }
  });

  it('✓ accepts perfectly balanced transaction', async () => {
    const payload = getValidPayload();
    const result = await service.validateDraft(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('✓ rejects debit != credit', async () => {
    const payload = getValidPayload();
    payload.ledgerEntries[0].amount = '100.50';
    payload.ledgerEntries[1].amount = '100.00'; // Mismatch
    const result = await service.validateDraft(payload);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(i => i.message.includes('Debit and Credit mismatch'))).toBe(true);
  });

  it('✓ rejects orphan ledger missing ledgerId', async () => {
    const payload = getValidPayload();
    payload.ledgerEntries[0].ledgerId = ''; // Orphan
    const result = await service.validateDraft(payload);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(i => i.message.includes('Orphan ledger entry missing ledgerId'))).toBe(true);
  });

  it('✓ rejects missing tenantId', async () => {
    const payload = getValidPayload();
    payload.header.tenantId = '';
    const result = await service.validateDraft(payload);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(i => i.fieldPath === 'header.tenantId')).toBe(true);
  });

  it('✓ rejects missing transactionIntent', async () => {
    const payload = getValidPayload();
    (payload.header as any).transactionIntent = undefined;
    const result = await service.validateDraft(payload);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(i => i.fieldPath === 'header.transactionIntent')).toBe(true);
  });

  it('✓ rejects negative amounts (enforce absolute values)', async () => {
    const payload = getValidPayload();
    payload.ledgerEntries[0].amount = '-100.50';
    payload.ledgerEntries[1].amount = '-100.50';
    const result = await service.validateDraft(payload);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(i => i.message.includes('absolute positive values'))).toBe(true);
  });

  it('✓ injects validation errors into payload.metadata.validationErrors', async () => {
    const payload = getValidPayload();
    payload.ledgerEntries[1].amount = '99.00'; // Cause an error
    
    const result = await service.applyCompanyRules('tenant-1', payload);
    const modifiedPayload = result.normalizedPayload!;
    expect(modifiedPayload.metadata.validationErrors).toBeDefined();
    expect(modifiedPayload.metadata.validationErrors!.length).toBeGreaterThan(0);
    expect(modifiedPayload.metadata.validationErrors![0]).toContain('Debit and Credit mismatch');
  });
});
