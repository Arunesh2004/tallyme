export enum TransactionIntent {
  PURCHASE = 'PURCHASE',
  SALES = 'SALES',
  JOURNAL = 'JOURNAL',
  CONTRA = 'CONTRA',
  RECEIPT = 'RECEIPT',
  PAYMENT = 'PAYMENT',
}

export enum AccountingSide {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum ValidationSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}
