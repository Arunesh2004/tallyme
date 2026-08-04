import { Logger } from '@nestjs/common';
import { OCRProvider, OCRResult } from './ocr-provider.interface';

export class FailoverOCRProvider implements OCRProvider {
  private readonly logger = new Logger(FailoverOCRProvider.name);

  constructor(private readonly providers: { name: string; provider: OCRProvider }[]) {
    if (this.providers.length === 0) {
      throw new Error('At least one OCR provider must be configured for failover.');
    }
  }

  async extractText(
    documentBuffer: Buffer,
    metadata?: Record<string, any>,
  ): Promise<OCRResult> {
    const errors: any[] = [];
    
    for (let i = 0; i < this.providers.length; i++) {
      const { name, provider } = this.providers[i];
      try {
        this.logger.log(`[FAILOVER] Attempting extraction with provider: ${name}`);
        const result = await provider.extractText(documentBuffer, metadata);
        if (i > 0) {
          this.logger.log(`[FAILOVER] Successfully failed over to ${name}`);
        }
        return result;
      } catch (error: any) {
        this.logger.error(`[FAILOVER] Provider ${name} ultimately failed: ${error.message}`);
        
        // Ensure error is categorized if not already
        if (error.isTransient !== undefined) {
           // We might only want to failover on certain errors, but generally if a provider is fully down
           // or exhausted retries, we want to failover.
        }
        
        errors.push({ provider: name, error: error.message, category: error.failureCategory });
        
        if (i === this.providers.length - 1) {
          this.logger.error(`[FAILOVER] All providers exhausted. Final failure.`);
          const finalError = new Error(`OCR Extraction failed across all providers: ${JSON.stringify(errors)}`);
          (finalError as any).details = errors;
          throw finalError;
        }
      }
    }
    throw new Error('Unreachable');
  }
}
