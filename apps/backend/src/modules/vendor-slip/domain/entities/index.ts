// entities/index.ts
import { InvoiceNumber, InvoiceDate, InvoiceAmount, ConfidenceScore } from '../value-objects';
import { GSTIN } from '../../../shared/domain/value-objects';

export class InvoiceDocument {
  constructor(
    public readonly id: string,
    public readonly s3Url: string,
    public readonly uploadedAt: Date,
    public status: 'UPLOADED' | 'OCR_PROCESSING' | 'OCR_COMPLETED' | 'FAILED'
  ) {}
}

export class InvoiceCandidate {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly invoiceNumber: InvoiceNumber,
    public readonly invoiceDate: InvoiceDate,
    public readonly totalAmount: InvoiceAmount,
    public readonly extractedGstin: GSTIN | null,
    public readonly confidence: ConfidenceScore,
    public status: 'EXTRACTED' | 'MATCHED' | 'REVIEW'
  ) {}
}

export class VendorMatch {
  constructor(
    public readonly id: string,
    public readonly candidateId: string,
    public readonly vendorId: string,
    public readonly matchConfidence: ConfidenceScore
  ) {}
}

export class ExpenseAllocation {
  constructor(
    public readonly id: string,
    public readonly matchId: string,
    public readonly lineItems: any[], // Stub
    public readonly totalAllocated: InvoiceAmount
  ) {}
}

export class LedgerMapping {
  constructor(
    public readonly id: string,
    public readonly vendorId: string,
    public readonly defaultLedgerCode: string
  ) {}
}
