import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseStrategy } from './purchase.strategy';
import { LedgerResolver } from '../ledger.resolver';
import { ReferenceGenerator } from '../reference.generator';
import { VoucherValidator } from '../voucher.validator';

describe('PurchaseStrategy', () => {
  let strategy: PurchaseStrategy;

  const mockLedgerResolver = {};
  const mockReferenceGenerator = {
    generateVoucherNumber: jest.fn().mockReturnValue('PUR-123'),
  };
  const mockValidator = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseStrategy,
        { provide: LedgerResolver, useValue: mockLedgerResolver },
        { provide: ReferenceGenerator, useValue: mockReferenceGenerator },
        { provide: VoucherValidator, useValue: mockValidator },
      ],
    }).compile();

    strategy = module.get<PurchaseStrategy>(PurchaseStrategy);
  });

  it('should build purchase voucher with detailed credit lines', async () => {
    const payload = {
      invoice: { number: 'INV1', date: '2026-01-01' },
      allocation: {
        creditLines: [
          { ledger: 'Vendor', amount: 1000, isVendor: true },
          { ledger: 'Discount', amount: 100, isVendor: false },
        ],
        debitLines: [
          { ledger: 'Expense', amount: 1100, hsnSac: '123' },
        ]
      }
    };

    const result = await strategy.build(payload);

    expect(result.lines).toHaveLength(3);
    expect(result.lines[0]).toEqual(expect.objectContaining({ type: 'CREDIT', amount: 1000, ledgerName: 'Vendor', isParty: true }));
    expect(result.lines[1]).toEqual(expect.objectContaining({ type: 'CREDIT', amount: 100, ledgerName: 'Discount', isParty: false }));
    expect(result.lines[2]).toEqual(expect.objectContaining({ type: 'DEBIT', amount: 1100, ledgerName: 'Expense', hsnSac: '123' }));
    expect(mockValidator.validate).toHaveBeenCalledWith(result);
  });

  it('should build purchase voucher with legacy fallback', async () => {
    const payload = {
      invoice: { number: 'INV2', date: '2026-01-01' },
      allocation: {
        vendorLedger: 'Vendor Legacy',
        totalAmount: 500,
        lines: [
          { ledger: 'Expense Legacy', amount: 500 }
        ]
      }
    };

    const result = await strategy.build(payload);

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toEqual(expect.objectContaining({ type: 'CREDIT', amount: 500, ledgerName: 'Vendor Legacy', isParty: true }));
    expect(result.lines[1]).toEqual(expect.objectContaining({ type: 'DEBIT', amount: 500, ledgerName: 'Expense Legacy' }));
  });
});
