import { Injectable } from '@nestjs/common';
import { IVoucherStrategy } from './voucher.strategy.interface';
import { VoucherBuildResult } from '../../interfaces/voucher.interfaces';
import { LedgerResolver } from '../ledger.resolver';
import { ReferenceGenerator } from '../reference.generator';
import { VoucherValidator } from '../voucher.validator';
import { VOUCHER_STATUS } from '../../constants/voucher.constants';
import * as crypto from 'crypto';

@Injectable()
export class PurchaseStrategy implements IVoucherStrategy {
  constructor(
    private readonly ledgerResolver: LedgerResolver,
    private readonly referenceGenerator: ReferenceGenerator,
    private readonly validator: VoucherValidator,
  ) {}

  async build(payload: any): Promise<VoucherBuildResult> {
    const { allocation, invoice } = payload;

    // Using explicit string 'PURCHASE' instead of VOUCHER_TYPES.PURCHASE
    // since VOUCHER_TYPES might not have PURCHASE yet.
    const result: VoucherBuildResult = {
      voucherType: 'PURCHASE',
      voucherNumber: this.referenceGenerator.generateVoucherNumber('PURCHASE'),
      lines: [],
      narrations: [
        `Being purchase invoice ${invoice.number} booked automatically`,
      ],
      references: [
        { type: 'InvoiceNumber', value: invoice.number },
        { type: 'InvoiceDate', value: invoice.date },
      ],
      totalDebit: 0,
      totalCredit: 0,
      status: VOUCHER_STATUS.DRAFT,
      warnings: [],
      isBalanced: false,
    };

    // Process Credit Lines (Vendor, Discount, Round Off)
    if (allocation.creditLines && Array.isArray(allocation.creditLines)) {
      for (const line of allocation.creditLines) {
        result.lines.push({
          ledgerId: crypto.randomUUID(), // (implementation note)
          ledgerName: line.ledger,
          type: 'CREDIT',
          amount: Number(line.amount),
          description: line.isVendor
            ? `Purchase from vendor`
            : `Credit adjustment`,
          isParty: line.isVendor || false,
        });
      }
    } else {
      // Legacy fallback
      result.lines.push({
        ledgerId: crypto.randomUUID(),
        ledgerName: allocation.vendorLedger,
        type: 'CREDIT',
        amount: Number(allocation.totalAmount),
        description: `Purchase from vendor`,
        isParty: true,
      });
    }

    // Process Debit Lines (Expense, GST, Freight, Round Off)
    const debitLines = allocation.debitLines || allocation.lines || [];
    for (const line of debitLines) {
      result.lines.push({
        ledgerId: crypto.randomUUID(), // (implementation note)
        ledgerName: line.ledger,
        type: 'DEBIT',
        amount: Number(line.amount),
        description: `Expense/Tax allocation`,
        hsnSac: line.hsnSac,
        rate: line.rate,
        quantity: line.quantity,
        unit: line.unit,
      });
    }

    this.validator.validate(result);
    return result;
  }
}
