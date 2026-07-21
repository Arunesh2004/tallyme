export interface IOCRProvider {
  /**
   * Processes a document and returns the raw OCR text.
   * @param documentUrl The URL or path to the document.
   * @param mimeType The mime type of the document.
   * @returns The extracted raw text and an overall confidence score (0-1).
   */
  processDocument(
    documentUrl: string,
    mimeType: string,
  ): Promise<{ text: string; confidence: number }>;
}
