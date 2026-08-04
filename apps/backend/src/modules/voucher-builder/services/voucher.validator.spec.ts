import { VoucherValidator } from './voucher.validator';
import { VOUCHER_STATUS } from '../constants/voucher.constants';
import { VoucherBuildResult } from '../interfaces/voucher.interfaces';

describe('VoucherValidator', () => {
  let validator: VoucherValidator;

  beforeEach(() => {
    validator = new VoucherValidator();
  });

  it('should validate balanced voucher', () => {
    const result: VoucherBuildResult = {
      voucherType: 'RECEIPT', voucherNumber: '1', status: VOUCHER_STATUS.DRAFT, warnings: [],
      lines: [
        { type: 'DEBIT', amount: 100, ledgerId: '1' } as any,
        { type: 'CREDIT', amount: 100, ledgerId: '2' } as any,
      ] as any,
      narrations: [], references: [], totalDebit: 0, totalCredit: 0, isBalanced: false
    };
    validator.validate(result);
    expect(result.isBalanced).toBe(true);
    expect(result.status).toBe(VOUCHER_STATUS.VALIDATED);
  });

  it('should invalidate unbalanced voucher', () => {
    const result: VoucherBuildResult = {
      voucherType: 'RECEIPT', voucherNumber: '1', status: VOUCHER_STATUS.DRAFT, warnings: [],
      lines: [
        { type: 'DEBIT', amount: 100, ledgerId: '1' } as any,
        { type: 'CREDIT', amount: 50, ledgerId: '2' } as any,
      ] as any,
      narrations: [], references: [], totalDebit: 0, totalCredit: 0, isBalanced: false
    };
    validator.validate(result);
    expect(result.isBalanced).toBe(false);
    expect(result.status).toBe(VOUCHER_STATUS.INVALID);
    expect(result.warnings).toContain('Voucher is unbalanced');
  });

  it('should invalidate negative amounts', () => {
    const result: VoucherBuildResult = {
      voucherType: 'RECEIPT', voucherNumber: '1', status: VOUCHER_STATUS.DRAFT, warnings: [],
      lines: [
        { type: 'DEBIT', amount: -100, ledgerId: '1' } as any,
        { type: 'CREDIT', amount: -100, ledgerId: '2' } as any,
      ] as any,
      narrations: [], references: [], totalDebit: 0, totalCredit: 0, isBalanced: false
    };
    validator.validate(result);
    expect(result.status).toBe(VOUCHER_STATUS.INVALID);
    expect(result.warnings).toContain('Voucher line amount cannot be negative');
  });

  it('should mark MANUAL_REVIEW if missing ledgerId', () => {
    const result: VoucherBuildResult = {
      voucherType: 'RECEIPT', voucherNumber: '1', status: VOUCHER_STATUS.DRAFT, warnings: [],
      lines: [
        { type: 'DEBIT', amount: 100, ledgerId: '1' } as any,
        { type: 'CREDIT', amount: 100, ledgerId: null } as any,
      ] as any,
      narrations: [], references: [], totalDebit: 0, totalCredit: 0, isBalanced: false
    };
    validator.validate(result);
    expect(result.status).toBe(VOUCHER_STATUS.MANUAL_REVIEW);
    expect(result.warnings).toContain('Missing ledger resolution on one or more lines');
  });
});
