export interface VoucherEntryInput {
  ledgerId: string;
  isDebit: boolean;
  amount: number;
  narration?: string;
}

export interface CompiledVoucher {
  accountingTransactionId: string;
  voucherType: string;
  date: Date;
  narration?: string;
  entries: VoucherEntryInput[];
}

export interface VoucherCompiler {
  /**
   * The voucher type this compiler supports (e.g., RECEIPT)
   */
  supportsType(): string;

  /**
   * Transforms an AccountingTransaction into a canonical CompiledVoucher.
   */
  compile(transaction: any, entries: any[]): CompiledVoucher;
}
