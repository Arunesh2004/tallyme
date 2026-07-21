import { VoucherBuilderEngine } from './voucher-builder.engine';
import { LedgerResolver } from './ledger.resolver';
import { ReferenceGenerator } from './reference.generator';
import { NarrationBuilder } from './narration.builder';
import { VoucherValidator } from './voucher.validator';

describe('VoucherBuilderEngine', () => {
  let engine: VoucherBuilderEngine;
  let ledgerResolver: any;
  let referenceGenerator: any;
  let narrationBuilder: any;
  let validator: VoucherValidator;

  beforeEach(() => {
    ledgerResolver = {
      resolveDebitLedger: jest.fn().mockResolvedValue({ id: 'L1', name: 'Bank' }),
      resolveCreditLedger: jest.fn().mockResolvedValue({ id: 'L2', name: 'Tuition Fees' }),
      resolveAdvanceLedger: jest.fn().mockResolvedValue({ id: 'L3', name: 'Student Advance' }),
    };

    referenceGenerator = {
      generateVoucherNumber: jest.fn().mockReturnValue('VCH-001'),
      extractReferences: jest.fn().mockReturnValue([]),
    };

    narrationBuilder = {
      buildReceiptNarration: jest.fn().mockReturnValue(['Payment received']),
    };

    validator = new VoucherValidator();

    engine = new VoucherBuilderEngine(
      ledgerResolver as unknown as LedgerResolver,
      referenceGenerator as unknown as ReferenceGenerator,
      narrationBuilder as unknown as NarrationBuilder,
      validator,
    );
  });

  it('should build a balanced voucher for exact payment', async () => {
    const paymentData = { amount: 1000 };
    const allocationData = {
      allocatedAmount: 1000,
      remainingAmount: 0,
      allocationBreakdown: [{ feeHeadName: 'Tuition', allocated: 1000 }],
    };
    const student = { name: 'John' };

    const result = await engine.buildReceiptVoucher(allocationData, paymentData, student);

    expect(result.totalDebit).toBe(1000);
    expect(result.totalCredit).toBe(1000);
    expect(result.isBalanced).toBe(true);
    expect(result.lines.length).toBe(2);
    expect(result.lines[0].type).toBe('DEBIT');
    expect(result.lines[0].amount).toBe(1000);
    expect(result.lines[1].type).toBe('CREDIT');
    expect(result.lines[1].amount).toBe(1000);
  });

  it('should build a balanced voucher for overpayment with advance ledger', async () => {
    const paymentData = { amount: 1200 };
    const allocationData = {
      allocatedAmount: 1000,
      remainingAmount: 200,
      allocationBreakdown: [{ feeHeadName: 'Tuition', allocated: 1000 }],
    };
    const student = { name: 'John' };

    const result = await engine.buildReceiptVoucher(allocationData, paymentData, student);

    expect(result.totalDebit).toBe(1200);
    expect(result.totalCredit).toBe(1200);
    expect(result.isBalanced).toBe(true);
    expect(result.lines.length).toBe(3);
    expect(result.lines[0].type).toBe('DEBIT');
    expect(result.lines[0].amount).toBe(1200);
    expect(result.lines[1].type).toBe('CREDIT');
    expect(result.lines[1].amount).toBe(1000);
    expect(result.lines[2].type).toBe('CREDIT');
    expect(result.lines[2].ledgerName).toBe('Student Advance');
    expect(result.lines[2].amount).toBe(200);
  });

  it('should flag unbalanced vouchers if something goes wrong', async () => {
    const paymentData = { amount: 1000 };
    const allocationData = {
      allocatedAmount: 800,
      remainingAmount: 0, // Error in allocation logic upstream
      allocationBreakdown: [{ feeHeadName: 'Tuition', allocated: 800 }],
    };
    const student = { name: 'John' };

    const result = await engine.buildReceiptVoucher(allocationData, paymentData, student);

    expect(result.isBalanced).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.warnings).toContain('Voucher is unbalanced');
  });

  it('should invalidate voucher with negative lines', async () => {
    const paymentData = { amount: -100 };
    const allocationData = {
      allocatedAmount: -100,
      remainingAmount: 0,
      allocationBreakdown: [{ feeHeadName: 'Tuition', allocated: -100 }],
    };
    const student = { name: 'John' };

    const result = await engine.buildReceiptVoucher(allocationData, paymentData, student);

    expect(result.status).toBe('INVALID');
    expect(result.warnings).toContain('Voucher line amount cannot be negative');
  });
});
