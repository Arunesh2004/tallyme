// Currency.ts
export enum Currency {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR'
}

// VoucherType.ts
export enum VoucherType {
  RECEIPT = 'RECEIPT',
  PURCHASE = 'PURCHASE',
  PAYMENT = 'PAYMENT',
  JOURNAL = 'JOURNAL',
  CONTRA = 'CONTRA',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE'
}

// PaymentMode.ts
export enum PaymentMode {
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  CREDIT_CARD = 'CREDIT_CARD'
}

// InvoiceStatus.ts
export enum InvoiceStatus {
  UPLOADED = 'UPLOADED',
  OCR_PROCESSING = 'OCR_PROCESSING',
  OCR_COMPLETED = 'OCR_COMPLETED',
  AI_PROCESSING = 'AI_PROCESSING',
  AI_COMPLETED = 'AI_COMPLETED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED'
}

// ValidationStatus.ts
export enum ValidationStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  FAILED = 'FAILED'
}
