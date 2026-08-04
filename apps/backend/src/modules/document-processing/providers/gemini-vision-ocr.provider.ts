import { Injectable, Logger } from '@nestjs/common';
import { OCRProvider, OCRResult } from './ocr-provider.interface';
import { GeminiClientService } from './gemini-client.service';
import { withResilience } from '../../../shared/utils/resilience.util';

@Injectable()
export class GeminiVisionOCRProvider implements OCRProvider {
  private readonly logger = new Logger(GeminiVisionOCRProvider.name);

  constructor(private readonly geminiClient: GeminiClientService) {}

  async extractText(
    documentBuffer: Buffer,
    metadata?: Record<string, any>,
  ): Promise<OCRResult> {
    const operation = async () => {
      this.logger.log(
        `Starting Gemini Vision OCR extraction for document (${documentBuffer.length} bytes)`,
      );

      const response = await this.geminiClient.ai.models.generateContent({
        model: this.geminiClient.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: documentBuffer.toString('base64'),
                  mimeType: metadata?.mimeType || 'application/pdf',
                },
              },
              {
                text: 'Perform OCR on this document and return only the raw text you extract.',
              },
            ],
          },
        ],
      });

      const text = response.text;
      if (!text) {
        throw new Error('No content returned from Gemini Vision OCR');
      }

      this.logger.log('Successfully extracted text via Gemini Vision OCR.');

      return {
        text: text,
        metadata: {
          ...metadata,
          provider: 'gemini-vision-ocr',
          extractedAt: new Date().toISOString(),
        },
      };
    };

    return withResilience(operation, 'GeminiVision', 'extractText', undefined, 3, 1500);
  }
}
