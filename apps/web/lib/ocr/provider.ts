export interface OCRResult {
  rawText: string;
  metadata: {
    confidence: number;
    pages: number;
    provider: string;
  };
}

export interface OCRProvider {
  /**
   * Processes a document and extracts text.
   * @param fileBuffer The binary content of the file
   * @param mimeType The mime type (e.g., application/pdf, image/png)
   */
  // eslint-disable-next-line no-unused-vars
  process(fileBuffer: Buffer, mimeType: string): Promise<OCRResult>;
}
