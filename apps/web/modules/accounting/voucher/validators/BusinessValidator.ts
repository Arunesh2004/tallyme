import { Voucher } from '../entities/Voucher';

export class BusinessValidator {
  public static validate(voucher: Voucher): void {
    let totalDebit = 0;
    let totalCredit = 0;

    // Standard Ledger Entries
    for (const entry of voucher.ledgerEntries) {
      if (entry.isDeemedPositive) {
        totalDebit += entry.amount;
      } else {
        totalCredit += entry.amount;
      }
    }

    // Tax Entries (If modeled separately)
    if (voucher.taxEntries) {
      for (const entry of voucher.taxEntries) {
        if (entry.isDeemedPositive) {
          totalDebit += entry.taxAmount;
        } else {
          totalCredit += entry.taxAmount;
        }
      }
    }

    // Floating point precision fix for Javascript
    const epsilon = 0.01;
    if (Math.abs(totalDebit - totalCredit) > epsilon) {
      throw new Error(`Voucher is unbalanced. Total Debits: ${totalDebit.toFixed(2)}, Total Credits: ${totalCredit.toFixed(2)}`);
    }
  }
}
