// apps/backend/src/modules/vendor-slip/domain/services/voucher.service.spec.ts
import { VoucherValidator, VoucherCandidate, VoucherEntry } from './voucher.service';
import { DecimalWrapper } from '../../../../infrastructure/prisma';
import * as crypto from 'crypto';

describe('VoucherValidator', () => {
  let validator: VoucherValidator;

  beforeEach(() => {
    validator = new VoucherValidator();
  });

  it('should pass validation when Debits equal Credits', () => {
    const candidate = new VoucherCandidate(
      crypto.randomUUID(),
      crypto.randomUUID(),
      'Purchase',
      new Date(),
      'Test Narration',
      [
        new VoucherEntry('Expense Ledger', new DecimalWrapper(100), true),
        new VoucherEntry('Vendor Ledger', new DecimalWrapper(100), false)
      ]
    );

    const result = validator.validate(candidate);
    expect(result.isSuccess).toBe(true);
  });

  it('should fail validation when Debits do NOT equal Credits', () => {
    const candidate = new VoucherCandidate(
      crypto.randomUUID(),
      crypto.randomUUID(),
      'Purchase',
      new Date(),
      'Test Narration',
      [
        new VoucherEntry('Expense Ledger', new DecimalWrapper(100), true),
        new VoucherEntry('Vendor Ledger', new DecimalWrapper(90), false)
      ]
    );

    const result = validator.validate(candidate);
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Voucher must balance');
  });

  it('should fail validation if an entry is negative', () => {
    const candidate = new VoucherCandidate(
      crypto.randomUUID(),
      crypto.randomUUID(),
      'Purchase',
      new Date(),
      'Test Narration',
      [
        new VoucherEntry('Expense Ledger', new DecimalWrapper(-100), true),
        new VoucherEntry('Vendor Ledger', new DecimalWrapper(-100), false)
      ]
    );

    const result = validator.validate(candidate);
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('positive amounts');
  });
});
