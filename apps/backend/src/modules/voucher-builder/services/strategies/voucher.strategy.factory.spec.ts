import { Test, TestingModule } from '@nestjs/testing';
import { VoucherStrategyFactory } from './voucher.strategy.factory';
import { ReceiptStrategy } from './receipt.strategy';
import { PurchaseStrategy } from './purchase.strategy';

describe('VoucherStrategyFactory', () => {
  let factory: VoucherStrategyFactory;

  const mockReceipt = {};
  const mockPurchase = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherStrategyFactory,
        { provide: ReceiptStrategy, useValue: mockReceipt },
        { provide: PurchaseStrategy, useValue: mockPurchase },
      ],
    }).compile();

    factory = module.get<VoucherStrategyFactory>(VoucherStrategyFactory);
  });

  it('should return receipt strategy', () => {
    expect(factory.getStrategy('RECEIPT')).toBe(mockReceipt);
    expect(factory.getStrategy('receipt')).toBe(mockReceipt);
  });

  it('should return purchase strategy', () => {
    expect(factory.getStrategy('PURCHASE')).toBe(mockPurchase);
    expect(factory.getStrategy('purchase')).toBe(mockPurchase);
  });

  it('should throw for unknown strategy', () => {
    expect(() => factory.getStrategy('UNKNOWN')).toThrow('No strategy found for voucher type: UNKNOWN');
  });
});
