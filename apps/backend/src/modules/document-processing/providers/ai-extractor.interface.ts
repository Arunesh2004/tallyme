export interface InvoiceExtractionResult {
  vendorName: string | null;
  gstin: string | null;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  amount: number | null;
  taxAmount: number | null;
  lineItems?: any[];
  confidence: number;
  confidenceFactors?: any;
}

export interface AIExtractor {
  extractInvoiceFields(rawText: string): Promise<InvoiceExtractionResult>;
}
