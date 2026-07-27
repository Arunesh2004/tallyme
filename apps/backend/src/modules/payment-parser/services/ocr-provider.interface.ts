export interface IOcrResult {
  rawText: string;
  confidence: number;
  metadata?: Record<string, any>;
  provider: string;
}

export interface IOcrProvider {
  analyzeDocument(fileBuffer: Buffer, mimeType: string): Promise<IOcrResult>;
  checkHealth(): Promise<boolean>;
}
