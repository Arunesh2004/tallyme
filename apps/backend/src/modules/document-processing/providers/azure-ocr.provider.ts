import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { OCRProvider, OCRResult } from './ocr-provider.interface';

@Injectable()
export class AzureOCRProvider implements OCRProvider {
  private readonly logger = new Logger(AzureOCRProvider.name);
  private client: DocumentAnalysisClient | null = null;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('AZURE_OCR_ENDPOINT');
    const apiKey = this.configService.get<string>('AZURE_OCR_KEY');

    if (!endpoint || !apiKey) {
      this.logger.warn(
        'AZURE_OCR_ENDPOINT or AZURE_OCR_KEY is missing. AzureOCRProvider will gracefully fail on extraction.',
      );
    } else {
      try {
        this.client = new DocumentAnalysisClient(
          endpoint,
          new AzureKeyCredential(apiKey),
        );
      } catch (error: any) {
        this.logger.error(`Failed to initialize Azure DocumentAnalysisClient: ${error.message}`);
      }
    }
  }

  async extractText(
    documentBuffer: Buffer,
    metadata?: Record<string, any>,
  ): Promise<OCRResult> {
    if (!this.client) {
      throw new Error(
        'Azure DocumentAnalysisClient is not initialized. Check AZURE_OCR_ENDPOINT and AZURE_OCR_KEY.',
      );
    }

    try {
      this.logger.log(`Starting Azure Document Intelligence extraction for document (${documentBuffer.length} bytes)`);
      
      const poller = await this.client.beginAnalyzeDocument(
        'prebuilt-read',
        documentBuffer,
      );

      const { content } = await poller.pollUntilDone();

      if (!content) {
        throw new Error('No content returned from Azure Document Intelligence');
      }

      this.logger.log('Successfully extracted text via Azure Document Intelligence.');

      return {
        text: content,
        metadata: {
          ...metadata,
          provider: 'azure-document-intelligence',
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Azure OCR Extraction failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
