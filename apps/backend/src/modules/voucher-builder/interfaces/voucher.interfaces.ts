export interface IVoucherRepository {
  saveVoucherCandidate(data: any): Promise<any>;
  findLedgerByName(name: string): Promise<any>;
  logValidation(log: any): Promise<void>;
  logAttempt(attempt: any): Promise<void>;
  saveVoucherResult(candidateData: any, logData: any): Promise<any>;
}

export interface VoucherLineItem {
  ledgerId: string;
  ledgerName: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
}

export interface VoucherBuildResult {
  voucherType: string;
  voucherNumber: string;
  lines: VoucherLineItem[];
  narrations: string[];
  references: { type: string; value: string }[];
  totalDebit: number;
  totalCredit: number;
  status: string;
  warnings: string[];
  isBalanced: boolean;
}
