import { Test, TestingModule } from '@nestjs/testing';
import { FeeValidationEngine } from './validation.engine';
import { DuplicatePaymentRule } from '../rules/duplicate-payment.rule';
import { OverpaymentRule } from '../rules/overpayment.rule';

describe('FeeValidationEngine', () => {
  let engine: FeeValidationEngine;
  let duplicateRule: any;
  let overpaymentRule: any;

  beforeEach(async () => {
    duplicateRule = {
      evaluate: jest.fn().mockResolvedValue({
        ruleName: 'DuplicatePaymentRule',
        isValid: true,
        warnings: [],
        isDuplicate: false,
      }),
    };
    overpaymentRule = {
      evaluate: jest.fn().mockResolvedValue({
        ruleName: 'OverpaymentRule',
        isValid: true,
        warnings: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeeValidationEngine,
        { provide: DuplicatePaymentRule, useValue: duplicateRule },
        { provide: OverpaymentRule, useValue: overpaymentRule },
      ],
    }).compile();

    engine = module.get<FeeValidationEngine>(FeeValidationEngine);
  });

  it('should return VALID when all rules pass', async () => {
    const result = await engine.validate({ amount: 100 }, { outstandings: [] });
    expect(result.status).toBe('VALID');
    expect(result.requiresManualReview).toBe(false);
  });

  it('should aggregate warnings from all rules', async () => {
    duplicateRule.evaluate.mockResolvedValue({ isValid: true, warnings: ['Possible duplicate'], isDuplicate: false });
    overpaymentRule.evaluate.mockResolvedValue({ isValid: true, warnings: ['Overpayment detected'] });
    const result = await engine.validate({ amount: 100 }, { outstandings: [] });
    expect(result.warnings).toContain('Possible duplicate');
    expect(result.warnings).toContain('Overpayment detected');
  });

  it('should return MANUAL_REVIEW if duplicate payment detected', async () => {
    duplicateRule.evaluate.mockResolvedValue({
      isValid: true,
      warnings: [],
      isDuplicate: true,
      statusModifier: 'DUPLICATE_PAYMENT',
    });
    const result = await engine.validate({ amount: 100 }, { outstandings: [] });
    expect(result.status).toBe('MANUAL_REVIEW');
    expect(result.requiresManualReview).toBe(true);
    expect(result.duplicateCandidate).toBe(true);
  });

  it('should return MANUAL_REVIEW if overpayment detected', async () => {
    overpaymentRule.evaluate.mockResolvedValue({
      isValid: true,
      warnings: ['Overpayment'],
      statusModifier: 'OVERPAYMENT',
    });
    const result = await engine.validate({ amount: 1000 }, { outstandings: [] });
    expect(result.status).toBe('MANUAL_REVIEW');
    expect(result.requiresManualReview).toBe(true);
  });

  it('should set requiresManualReview if any rule returns isValid=false', async () => {
    overpaymentRule.evaluate.mockResolvedValue({ isValid: false, warnings: ['Zero amount'] });
    const result = await engine.validate({ amount: 0 }, { outstandings: [] });
    expect(result.requiresManualReview).toBe(true);
  });
});
