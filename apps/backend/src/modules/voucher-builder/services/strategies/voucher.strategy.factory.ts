import { Injectable } from '@nestjs/common';
import { IVoucherStrategy } from './voucher.strategy.interface';
import { ReceiptStrategy } from './receipt.strategy';
import { PurchaseStrategy } from './purchase.strategy';

@Injectable()
export class VoucherStrategyFactory {
  constructor(
    private readonly receiptStrategy: ReceiptStrategy,
    private readonly purchaseStrategy: PurchaseStrategy,
  ) {}

  getStrategy(type: string): IVoucherStrategy {
    switch (type.toUpperCase()) {
      case 'RECEIPT':
        return this.receiptStrategy;
      case 'PURCHASE':
        return this.purchaseStrategy;
      default:
        throw new Error(`No strategy found for voucher type: ${type}`);
    }
  }
}
