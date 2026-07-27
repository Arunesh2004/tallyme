export interface OCRResult {
  text: string;
  metadata?: Record<string, any>;
}

export interface OCRProvider {
  extractText(documentBuffer: Buffer, metadata?: Record<string, any>): Promise<OCRResult>;
}
