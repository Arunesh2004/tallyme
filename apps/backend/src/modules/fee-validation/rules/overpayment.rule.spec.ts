import { OverpaymentRule } from './overpayment.rule';

describe('OverpaymentRule', () => {
  let rule: OverpaymentRule;

  beforeEach(() => {
    rule = new OverpaymentRule();
  });

  const makeStudent = (outstandings: any[]) => ({ outstandings });

  it('should be invalid if amount is negative', async () => {
    const result = await rule.evaluate({ amount: -100 }, makeStudent([]));
    expect(result.isValid).toBe(false);
    expect(result.statusModifier).toBe('INVALID');
    expect(result.warnings).toContain('Payment amount cannot be negative');
  });

  it('should be invalid if amount is zero', async () => {
    const result = await rule.evaluate({ amount: 0 }, makeStudent([]));
    expect(result.isValid).toBe(false);
    expect(result.statusModifier).toBe('INVALID');
    expect(result.warnings).toContain('Payment amount cannot be zero');
  });

  it('should return OVERPAYMENT if payment exceeds outstanding', async () => {
    const student = makeStudent([
      { isPaid: false, amount: 500, amountPaid: 0 },
      { isPaid: true, amount: 500, amountPaid: 500 }, // ignored (already paid)
    ]);
    const result = await rule.evaluate({ amount: 600 }, student);
    expect(result.isValid).toBe(true);
    expect(result.statusModifier).toBe('OVERPAYMENT');
    expect(result.warnings).toContain('Payment amount exceeds total outstanding dues');
  });

  it('should return valid with no warnings if payment is within outstanding', async () => {
    const student = makeStudent([
      { isPaid: false, amount: 1000, amountPaid: 200 },
    ]);
    const result = await rule.evaluate({ amount: 500 }, student);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('FeeValidation Exceptions', () => {
  it('should instantiate FeeValidationDomainException', async () => {
    const { FeeValidationDomainException } = await import('../exceptions/validation.exceptions');
    const e = new FeeValidationDomainException('Test error');
    expect(e.message).toBe('Test error');
    expect(e.getStatus()).toBe(400);
  });

  it('should instantiate InvalidValidationCandidateException with prefix', async () => {
    const { InvalidValidationCandidateException } = await import('../exceptions/validation.exceptions');
    const e = new InvalidValidationCandidateException('missing student id');
    expect(e.message).toContain('Invalid candidate for validation');
    expect(e.message).toContain('missing student id');
    expect(e.getStatus()).toBe(422);
  });
});
