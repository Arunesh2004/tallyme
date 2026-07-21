import { Injectable } from '@nestjs/common';
import { LedgerResolver } from './ledger.resolver';
import { ReferenceGenerator } from './reference.generator';
import { NarrationBuilder } from './narration.builder';
import { VoucherValidator } from './voucher.validator';
import { VoucherBuildResult } from '../interfaces/voucher.interfaces';
import { VOUCHER_TYPES, VOUCHER_STATUS } from '../constants/voucher.constants';

@Injectable()
export class VoucherBuilderEngine {
  constructor(
    private readonly ledgerResolver: LedgerResolver,
    private readonly referenceGenerator: ReferenceGenerator,
    private readonly narrationBuilder: NarrationBuilder,
    private readonly validator: VoucherValidator,
  ) {}

  async buildReceiptVoucher(
    allocationData: any,
    paymentData: any,
    student: any,
  ): Promise<VoucherBuildResult> {
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

    // Debit Line
    const debitLedger =
      await this.ledgerResolver.resolveDebitLedger(paymentData);
    result.lines.push({
      ledgerId: debitLedger.id,
      ledgerName: debitLedger.name,
      type: 'DEBIT',
      amount: Number(paymentData.amount),
    });

    // Credit Lines (one for each fee head)
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

    // Advance Credit Line if there's overpayment
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

    // Validate
    this.validator.validate(result);

    return result;
  }
}
