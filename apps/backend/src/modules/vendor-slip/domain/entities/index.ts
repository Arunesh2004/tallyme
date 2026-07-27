// entities/index.ts
import {
  InvoiceNumber,
  InvoiceDate,
  InvoiceAmount,
  ConfidenceScore,
  ExtractedVendorName,
  ExtractedSubtotal,
  ExtractedTax,
  ExtractedGSTIN,
} from '../value-objects';

export class InvoiceDocument {
  constructor(
    public readonly id: string,
    public readonly s3Url: string,
    public readonly uploadedAt: Date,
    public status: 'UPLOADED' | 'OCR_PROCESSING' | 'OCR_COMPLETED' | 'FAILED',
  ) {}
}

export class InvoiceCandidate {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly extractedVendorName: ExtractedVendorName | null,
    public readonly invoiceNumber: InvoiceNumber | null,
    public readonly invoiceDate: InvoiceDate | null,
    public readonly extractedSubtotal: ExtractedSubtotal | null,
    public readonly extractedTax: ExtractedTax | null,
    public readonly totalAmount: InvoiceAmount | null,
    public readonly extractedGstin: ExtractedGSTIN | null,
    public readonly confidence: ConfidenceScore,
    public status:
      | 'PENDING_EXTRACTION'
      | 'EXTRACTED'
      | 'MANUAL_REVIEW_REQUIRED'
      | 'APPROVED'
      | 'QUEUED'
      | 'SYNCED'
      | 'FAILED',
  ) {}
}

export class VendorMatch {
  constructor(
    public readonly id: string,
    public readonly candidateId: string,
    public readonly vendorId: string,
    public readonly matchConfidence: ConfidenceScore,
  ) {}
}

export class ExpenseAllocation {
  constructor(
    public readonly id: string,
    public readonly matchId: string,
    public readonly lineItems: any[], // (implementation note)
    public readonly totalAllocated: InvoiceAmount,
  ) {}
}

export class LedgerMapping {
  constructor(
    public readonly id: string,
    public readonly vendorId: string,
    public readonly defaultLedgerCode: string,
  ) {}
}
