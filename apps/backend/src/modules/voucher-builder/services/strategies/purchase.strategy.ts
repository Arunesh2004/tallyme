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

    // Credit Vendor Ledger
    // In Tally, purchases credit the vendor and debit the purchase/expense accounts
    // We assume payload.allocation.vendorLedger contains the vendor ledger name
    result.lines.push({
      ledgerId: crypto.randomUUID(), // (implementation note)
      ledgerName: allocation.vendorLedger,
      type: 'CREDIT',
      amount: Number(allocation.totalAmount),
      description: `Purchase from vendor`,
    });

    // Debit Expense/Purchase Lines
    if (allocation.lines && Array.isArray(allocation.lines)) {
      for (const line of allocation.lines) {
        result.lines.push({
          ledgerId: crypto.randomUUID(), // (implementation note)
          ledgerName: line.ledger,
          type: 'DEBIT',
          amount: Number(line.amount),
          description: `Expense allocation`,
        });
      }
    }

    this.validator.validate(result);
    return result;
  }
}
