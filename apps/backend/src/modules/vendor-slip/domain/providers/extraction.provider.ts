export interface ExtractedInvoiceData {
  invoiceNumber: string | null;
  date: Date | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  extractedGstin: string | null;
  extractedPan: string | null;
  extractedName: string | null;
  confidence: number;
}

export interface IInvoiceExtractionProvider {
  /**
   * Extracts structured invoice data from raw OCR text using AI.
   * @param text The raw text from the OCR provider.
   * @returns Structured invoice data with extraction confidence.
   */
  extractInvoiceData(text: string): Promise<ExtractedInvoiceData>;
}
