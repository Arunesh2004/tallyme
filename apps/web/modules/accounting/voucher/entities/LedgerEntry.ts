export interface LedgerEntry {
  ledgerName: string;
  amount: number;
  isDeemedPositive: boolean; // true for Debit, false for Credit
}
