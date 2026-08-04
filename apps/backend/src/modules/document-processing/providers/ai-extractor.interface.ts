import { CanonicalAccountingModel } from '../../universal-transaction/domain/types';

export interface InvoiceExtractionResult {
  vendorName: string | null;
  vendorAddress: string | null;
  gstin: string | null;
  pan: string | null;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  purchaseOrder: string | null;
  state: string | null;
  placeOfSupply: string | null;
  subtotal: number | null;
  discount: number | null;
  freight: number | null;
  otherCharges: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  cess: number | null;
  roundOff: number | null;
  amount: number | null;
  taxAmount: number | null;
  paymentTerms: string | null;
  bankDetails: any;
  lineItems?: any[];
  confidence: number;
  confidenceFactors?: any;
}

export interface AIExtractor {
  extractInvoiceFields(
    rawText: string,
    documentBuffer?: Buffer,
    mimeType?: string,
  ): Promise<InvoiceExtractionResult>;

  extractUniversalDocument(
    documentType: string,
    rawText: string,
    documentBuffer?: Buffer,
    mimeType?: string,
  ): Promise<CanonicalAccountingModel>;
}
