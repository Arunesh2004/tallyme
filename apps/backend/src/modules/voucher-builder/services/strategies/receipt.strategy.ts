import { Injectable } from '@nestjs/common';
import { IVoucherStrategy } from './voucher.strategy.interface';
import { VoucherBuildResult } from '../../interfaces/voucher.interfaces';
import { LedgerResolver } from '../ledger.resolver';
import { ReferenceGenerator } from '../reference.generator';
import { NarrationBuilder } from '../narration.builder';
import { VoucherValidator } from '../voucher.validator';
import {
  VOUCHER_TYPES,
  VOUCHER_STATUS,
} from '../../constants/voucher.constants';

@Injectable()
export class ReceiptStrategy implements IVoucherStrategy {
  constructor(
    private readonly ledgerResolver: LedgerResolver,
    private readonly referenceGenerator: ReferenceGenerator,
    private readonly narrationBuilder: NarrationBuilder,
    private readonly validator: VoucherValidator,
  ) {}

  async build(payload: any): Promise<VoucherBuildResult> {
    const { allocationData, paymentData, student } = payload;

    const result: VoucherBuildResult = {
      voucherType: VOUCHER_TYPES.RECEIPT,
      voucherNumber: this.referenceGenerator.generateVoucherNumber(
        VOUCHER_TYPES.RECEIPT,
      ),
      lines: [],
      narrations: this.narrationBuilder.buildReceiptNarration(
        allocationData,
        paymentData,
        student,
      ),
      references: this.referenceGenerator.extractReferences(paymentData),
      totalDebit: 0,
      totalCredit: 0,
      status: VOUCHER_STATUS.DRAFT,
      warnings: [],
      isBalanced: false,
    };

    const debitLedger =
      await this.ledgerResolver.resolveDebitLedger(paymentData);
    result.lines.push({
      ledgerId: debitLedger.id,
      ledgerName: debitLedger.name,
      type: 'DEBIT',
      amount: Number(paymentData.amount),
    });

    for (const alloc of allocationData.allocationBreakdown) {
      const creditLedger = await this.ledgerResolver.resolveCreditLedger(
        alloc.feeHeadName,
      );
      result.lines.push({
        ledgerId: creditLedger.id,
        ledgerName: creditLedger.name,
        type: 'CREDIT',
        amount: Number(alloc.allocated),
        description: `Fee collection for ${alloc.feeHeadName}`,
      });
    }

    if (Number(allocationData.remainingAmount) > 0) {
      const advanceLedger = await this.ledgerResolver.resolveAdvanceLedger();
      result.lines.push({
        ledgerId: advanceLedger.id,
        ledgerName: advanceLedger.name,
        type: 'CREDIT',
        amount: Number(allocationData.remainingAmount),
        description: `Student advance balance`,
      });
    }

    this.validator.validate(result);
    return result;
  }
}
