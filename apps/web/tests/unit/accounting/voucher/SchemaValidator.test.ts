import { describe, it, expect } from 'vitest';
import { SchemaValidator } from '../../../../modules/accounting/voucher/validators/SchemaValidator';
import { VoucherType } from '../../../../modules/accounting/voucher/enums/VoucherType';

describe('SchemaValidator', () => {
  it('should validate a correct voucher', () => {
    const validData = {
      voucherType: VoucherType.Sales,
      date: '2023-05-01',
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 100, isDeemedPositive: true },
        { ledgerName: 'Sales', amount: 100, isDeemedPositive: false }
      ]
    };
    
    expect(() => SchemaValidator.validate(validData)).not.toThrow();
  });

  it('should throw on invalid date format', () => {
    const invalidData = {
      voucherType: VoucherType.Sales,
      date: '01/05/2023', // Invalid format
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 100, isDeemedPositive: true },
        { ledgerName: 'Sales', amount: 100, isDeemedPositive: false }
      ]
    };
    
    expect(() => SchemaValidator.validate(invalidData)).toThrow();
  });

  it('should require at least two ledger entries', () => {
    const invalidData = {
      voucherType: VoucherType.Sales,
      date: '2023-05-01',
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 100, isDeemedPositive: true }
      ]
    };
    
    expect(() => SchemaValidator.validate(invalidData)).toThrow();
  });
});
