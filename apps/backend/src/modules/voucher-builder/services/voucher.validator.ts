import { Injectable } from '@nestjs/common';
import { VoucherBuildResult } from '../interfaces/voucher.interfaces';
import { VOUCHER_STATUS } from '../constants/voucher.constants';

@Injectable()
export class VoucherValidator {
  validate(result: VoucherBuildResult): void {
    const totalDebit = result.lines
      .filter((l) => l.type === 'DEBIT')
      .reduce((s, l) => s + l.amount, 0);
    const totalCredit = result.lines
      .filter((l) => l.type === 'CREDIT')
      .reduce((s, l) => s + l.amount, 0);

    result.totalDebit = totalDebit;
    result.totalCredit = totalCredit;

    // JS float precision issue handling
    result.isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    if (!result.isBalanced) {
      result.warnings.push('Voucher is unbalanced');
      result.status = VOUCHER_STATUS.INVALID;
    }

    if (result.lines.some((l) => Number(l.amount) < 0)) {
      result.warnings.push('Voucher line amount cannot be negative');
      result.status = VOUCHER_STATUS.INVALID;
    }

    if (result.lines.some((l) => !l.ledgerId)) {
      result.warnings.push('Missing ledger resolution on one or more lines');
      result.status = VOUCHER_STATUS.MANUAL_REVIEW;
    }

    if (
      result.status === VOUCHER_STATUS.DRAFT &&
      result.warnings.length === 0
    ) {
      result.status = VOUCHER_STATUS.VALIDATED;
    }
  }
}
