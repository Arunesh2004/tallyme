export interface TallyCompany {
  name: string;
  guid: string;
  booksFrom: string;
}

export interface TallyLedger {
  name: string;
  parent: string;
  guid: string;
  openingBalance?: string;
}

export interface TallyVoucherType {
  name: string;
  parent: string;
  guid: string;
}

export interface TallyVoucher {
  date: string;
  voucherType: string;
  voucherTypeName?: string;
  narration?: string;
  ledgers: {
    ledgerName: string;
    amount: string; // Negative for Debit, Positive for Credit in Tally typically, but format carefully
    isDeemedPositive: boolean;
  }[];
}

export interface TallyErrorResponse {
  code: string;
  message: string;
  lineError?: string;
}
