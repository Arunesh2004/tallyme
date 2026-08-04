import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptStrategy } from './receipt.strategy';
import { LedgerResolver } from '../ledger.resolver';
import { ReferenceGenerator } from '../reference.generator';
import { NarrationBuilder } from '../narration.builder';
import { VoucherValidator } from '../voucher.validator';
import { VOUCHER_STATUS } from '../../constants/voucher.constants';

describe('ReceiptStrategy', () => {
  let strategy: ReceiptStrategy;

  const mockLedgerResolver = {
    resolveDebitLedger: jest.fn(),
    resolveCreditLedger: jest.fn(),
    resolveAdvanceLedger: jest.fn(),
  };

  const mockReferenceGenerator = {
    generateVoucherNumber: jest.fn().mockReturnValue('REC-123'),
    extractReferences: jest.fn().mockReturnValue([]),
  };

  const mockNarrationBuilder = {
    buildReceiptNarration: jest.fn().mockReturnValue(['narration']),
  };

  const mockValidator = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptStrategy,
        { provide: LedgerResolver, useValue: mockLedgerResolver },
        { provide: ReferenceGenerator, useValue: mockReferenceGenerator },
        { provide: NarrationBuilder, useValue: mockNarrationBuilder },
        { provide: VoucherValidator, useValue: mockValidator },
      ],
    }).compile();

    strategy = module.get<ReceiptStrategy>(ReceiptStrategy);
  });

  it('should build receipt voucher with advance', async () => {
    mockLedgerResolver.resolveDebitLedger.mockResolvedValue({ id: 'debit-1', name: 'Bank' });
    mockLedgerResolver.resolveCreditLedger.mockResolvedValue({ id: 'credit-1', name: 'Fee' });
    mockLedgerResolver.resolveAdvanceLedger.mockResolvedValue({ id: 'adv-1', name: 'Advance' });

    const payload = {
      allocationData: {
        allocationBreakdown: [{ feeHeadName: 'Tuition', allocated: 400 }],
        remainingAmount: 100
      },
      paymentData: { amount: 500 },
      student: {}
    };

    const result = await strategy.build(payload);

    expect(result.lines).toHaveLength(3);
    expect(result.lines[0]).toEqual(expect.objectContaining({ type: 'DEBIT', amount: 500, ledgerName: 'Bank' }));
    expect(result.lines[1]).toEqual(expect.objectContaining({ type: 'CREDIT', amount: 400, ledgerName: 'Fee' }));
    expect(result.lines[2]).toEqual(expect.objectContaining({ type: 'CREDIT', amount: 100, ledgerName: 'Advance' }));
    expect(mockValidator.validate).toHaveBeenCalledWith(result);
  });

  it('should build receipt voucher without advance', async () => {
    mockLedgerResolver.resolveDebitLedger.mockResolvedValue({ id: 'debit-1', name: 'Bank' });
    mockLedgerResolver.resolveCreditLedger.mockResolvedValue({ id: 'credit-1', name: 'Fee' });

    const payload = {
      allocationData: {
        allocationBreakdown: [{ feeHeadName: 'Tuition', allocated: 500 }],
        remainingAmount: 0
      },
      paymentData: { amount: 500 },
      student: {}
    };

    const result = await strategy.build(payload);

    expect(result.lines).toHaveLength(2);
    expect(mockLedgerResolver.resolveAdvanceLedger).not.toHaveBeenCalled();
  });
});
