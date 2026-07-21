import { RawAccountingTransaction, ResolvedAccountingEntry } from '../types/AccountingDTOs';

export class DoubleEntryValidator {
  /**
   * Validates that Sum(Debits) === Sum(Credits).
   * Throws if unbalanced.
   */
  public static validate(entries: ResolvedAccountingEntry[]): void {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      totalDebit += entry.debit;
      totalCredit += entry.credit;
    }

    // Use a small epsilon to handle floating point issues if necessary, but we should be dealing with fixed decimal logic
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`IMBALANCED_TRANSACTION: Debits (${totalDebit}) do not equal Credits (${totalCredit}). Difference: ${Math.abs(totalDebit - totalCredit)}`);
    }
  }
}
