export interface ExtractedInvoice {
  vendorName: string | null;
  gstin: string | null;
  invoiceNumber: string | null;
  date: string | null;
  totalAmount: number | null;
  taxAmount: number | null;
  confidenceScore: number;
}

export interface AIExtractor {
  /**
   * Extracts structured JSON from raw OCR text.
   */
  // eslint-disable-next-line no-unused-vars
  extractInvoice(rawText: string): Promise<ExtractedInvoice>;
}
