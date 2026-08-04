import { Test, TestingModule } from '@nestjs/testing';
import { AccountingIntelligenceService, InvoiceDiscrepancyResolver } from './accounting-intelligence.service';
import { LedgerMappingEngine } from '../ledger-mapping/ledger-mapping.engine';
import { AccountingRulesEngine } from '../rules-engine/accounting-rules.engine';
import { AccountingDecisionAuditService } from '../decision-audit/accounting-decision-audit.service';
import { TransactionType } from '../../../shared/domain/accounting-transaction';

describe('InvoiceDiscrepancyResolver', () => {
  it('should return MANUAL_REVIEW if extractedData or amount is missing', () => {
    const result = InvoiceDiscrepancyResolver.analyze('c1', null);
    expect(result.finalDecision).toBe('MANUAL_REVIEW');
  });

  it('should handle perfectly balanced invoice', () => {
    const result = InvoiceDiscrepancyResolver.analyze('c1', {
      amount: 118,
      subtotal: 100,
      cgst: 9,
      sgst: 9,
    });
    expect(result.difference).toBe(0);
    expect(result.finalDecision).toBe('BALANCED');
  });

  it('should detect missing CGST/SGST if taxAmount exists', () => {
    const result = InvoiceDiscrepancyResolver.analyze('c1', {
      amount: 118,
      subtotal: 100,
      taxAmount: 18,
    });
    expect(result.detectedIssues).toContain('MISSING_CGST');
    expect(result.suggestedRecoveries).toContainEqual({ type: 'CGST', amount: 9 });
    expect(result.suggestedRecoveries).toContainEqual({ type: 'SGST', amount: 9 });
  });

  it('should flag MANUAL_REVIEW if difference > 5 (discount missing)', () => {
    const result = InvoiceDiscrepancyResolver.analyze('c1', {
      amount: 90,
      subtotal: 100, // expecting 100 but total is 90 -> difference = 10
    });
    expect(result.detectedIssues).toContain('MISSING_DISCOUNT');
    expect(result.finalDecision).toBe('MANUAL_REVIEW');
  });

  it('should apply round off if difference <= 5', () => {
    const result = InvoiceDiscrepancyResolver.analyze('c1', {
      amount: 102,
      subtotal: 100.5,
    }); // 100.5 - 102 = -1.5 
    expect(result.detectedIssues).toContain('ROUND_OFF_DIFFERENCE');
    expect(result.suggestedRecoveries).toContainEqual({ type: 'ROUND_OFF', amount: 1.5 });
  });

  it('should flag MANUAL_REVIEW if difference < -5 (missing charges)', () => {
    const result = InvoiceDiscrepancyResolver.analyze('c1', {
      amount: 120,
      subtotal: 100, // expecting 100, but total is 120 -> difference = -20
    });
    expect(result.detectedIssues).toContain('UNKNOWN');
    expect(result.finalDecision).toBe('MANUAL_REVIEW');
  });
});

describe('AccountingIntelligenceService', () => {
  let service: AccountingIntelligenceService;
  let ledgerMappingEngine: any;
  let rulesEngine: any;
  let auditService: any;

  beforeEach(async () => {
    ledgerMappingEngine = {
      resolveExpenseLedger: jest.fn().mockResolvedValue({ selectedLedger: 'Office Supplies', confidence: 0.9 }),
      resolveGstLedger: jest.fn().mockResolvedValue({ selectedLedger: 'CGST Input', confidence: 1.0 }),
    };

    rulesEngine = {
      evaluate: jest.fn().mockResolvedValue({ requiresApproval: false, voucherType: 'Purchase', appliedRules: [] }),
    };

    auditService = {
      logDecision: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingIntelligenceService,
        { provide: LedgerMappingEngine, useValue: ledgerMappingEngine },
        { provide: AccountingRulesEngine, useValue: rulesEngine },
        { provide: AccountingDecisionAuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AccountingIntelligenceService>(AccountingIntelligenceService);
  });

  it('should throw if discrepancy resolver flags MANUAL_REVIEW', async () => {
    const req = {
      candidateId: 'c1', companyId: 'comp1',
      domainCandidate: { extractedData: { amount: null } },
      vendorLedgerName: 'Vendor A', normalizedConfidence: 0.9
    };
    await expect(service.generateVoucherPayload(req)).rejects.toThrow(/Core extraction value/);
  });

  it('should successfully generate payload for valid invoice', async () => {
    const req = {
      candidateId: 'c1', companyId: 'comp1',
      domainCandidate: { extractedData: { amount: 118, subtotal: 100, cgst: 9, sgst: 9, lineItems: [{ description: 'Pens', amount: 100 }] } },
      vendorLedgerName: 'Vendor A', normalizedConfidence: 0.9
    };
    const res = await service.generateVoucherPayload(req);
    expect(res.allocation.vendorLedger).toBe('Vendor A');
    expect(res.allocation.debitLines).toHaveLength(3); // Office Supplies, CGST, SGST
    expect(res.allocation.creditLines).toHaveLength(1); // Vendor A
  });

  it('should throw if no debit lines generated (total <= 0)', async () => {
    const req = {
      candidateId: 'c1', companyId: 'comp1',
      domainCandidate: { extractedData: { amount: 0, subtotal: 0 } },
      vendorLedgerName: 'Vendor A', normalizedConfidence: 0.9
    };
    await expect(service.generateVoucherPayload(req)).rejects.toThrow(/Total amount must be greater than 0/);
  });
  
  it('should throw if rules engine rejects', async () => {
    rulesEngine.evaluate.mockResolvedValue({ requiresApproval: true, explanation: 'Missing policy' });
    const req = {
      candidateId: 'c1', companyId: 'comp1',
      domainCandidate: { extractedData: { amount: 100, subtotal: 100, lineItems: [{ description: 'Pens', amount: 100 }] } },
      vendorLedgerName: 'Vendor A', normalizedConfidence: 0.9
    };
    await expect(service.generateVoucherPayload(req)).rejects.toThrow(/Rules Engine rejected/);
  });

  it('should handle missing ledgers and add miscellaneous expense', async () => {
    const req = {
      candidateId: 'c1', companyId: 'comp1',
      domainCandidate: { extractedData: { amount: 100, subtotal: 100, lineItems: [] } },
      vendorLedgerName: 'Vendor A', normalizedConfidence: 0.9
    };
    const res = await service.generateVoucherPayload(req);
    expect(res.allocation.debitLines[0].ledger).toBe('Miscellaneous Expenses');
  });

  it('should handle tax recovery on balance mismatch', async () => {
    ledgerMappingEngine.resolveGstLedger.mockResolvedValueOnce({ selectedLedger: 'CGST Tax', confidence: 1.0 });
    
    const req = {
      candidateId: 'c1', companyId: 'comp1',
      domainCandidate: { extractedData: { amount: 109, subtotal: 100, cgst: 9, lineItems: [{ description: 'Pens', amount: 100 }] } },
      vendorLedgerName: 'Vendor A', normalizedConfidence: 0.9
    };
    const res = await service.generateVoucherPayload(req);
    // CGST gets recovered and added to debit
    expect(res.allocation.debitLines.some((l: any) => l.ledger === 'CGST Tax')).toBeTruthy();
  });
});
