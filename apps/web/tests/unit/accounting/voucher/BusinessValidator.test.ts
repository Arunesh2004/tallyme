import { describe, it, expect } from 'vitest';
import { BusinessValidator } from '../../../../modules/accounting/voucher/validators/BusinessValidator';
import { VoucherType } from '../../../../modules/accounting/voucher/enums/VoucherType';
import { Voucher } from '../../../../modules/accounting/voucher/entities/Voucher';

describe('BusinessValidator', () => {
  it('should pass a balanced voucher', () => {
    const voucher: Voucher = {
      voucherType: VoucherType.Sales,
      date: '20230501',
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 150.50, isDeemedPositive: true }, // Debit
        { ledgerName: 'Sales', amount: 100, isDeemedPositive: false }, // Credit
        { ledgerName: 'IGST', amount: 50.50, isDeemedPositive: false } // Credit
      ]
    };
    
    expect(() => BusinessValidator.validate(voucher)).not.toThrow();
  });

  it('should throw on unbalanced voucher', () => {
    const voucher: Voucher = {
      voucherType: VoucherType.Sales,
      date: '20230501',
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 100, isDeemedPositive: true }, 
        { ledgerName: 'Sales', amount: 90, isDeemedPositive: false }
      ]
    };
    
    expect(() => BusinessValidator.validate(voucher)).toThrow(/Voucher is unbalanced/);
  });
});
