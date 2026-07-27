export interface IExtractionResult {
  value: any;
  confidence: number;
  sourceText?: string;
  needsManualReview?: boolean;
}

export interface IAiExtractionProvider {
  extractStructuredData(
    rawText: string,
    schema: any,
  ): Promise<IExtractionResult>;
  checkHealth(): Promise<boolean>;
}
