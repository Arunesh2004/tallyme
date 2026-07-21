export interface RawAccountingEntry {
  mappingKey: string;
  debit: number;
  credit: number;
  costCenter?: string;
  narration?: string;
}

export interface ResolvedAccountingEntry {
  ledgerId: string;
  debit: number;
  credit: number;
  costCenter?: string;
  narration?: string;
}

export interface RawAccountingTransaction {
  referenceId: string;
  referenceType: string;
  transactionDate: Date;
  description: string;
  voucherType: string; // RECEIPT, PAYMENT, JOURNAL, etc.
  entries: RawAccountingEntry[];
  sourceEventId: string;
}
