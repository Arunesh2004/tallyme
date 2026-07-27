import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AzureOCRProvider } from './providers/azure-ocr.provider';
import { GeminiVisionOCRProvider } from './providers/gemini-vision-ocr.provider';

export const ocrProviderFactory = {
  provide: 'OCRProvider',
  useFactory: (
    configService: ConfigService,
    azureOcrProvider: AzureOCRProvider,
    geminiVisionOcrProvider: GeminiVisionOCRProvider,
  ) => {
    const logger = new Logger('OCRProviderFactory');
    const providerConfig = (configService.get<string>('OCR_PROVIDER') || 'auto').trim().toLowerCase();

    if (providerConfig === 'azure') {
      const endpoint = configService.get<string>('AZURE_OCR_ENDPOINT');
      const key = configService.get<string>('AZURE_OCR_KEY');
      if (!endpoint || !key) {
        throw new Error(
          'OCR_PROVIDER is set to azure, but AZURE_OCR_ENDPOINT or AZURE_OCR_KEY is missing.',
        );
      }
      logger.log('OCR Provider: Azure Document Intelligence');
      return azureOcrProvider;
    }

    if (providerConfig === 'gemini') {
      logger.log('OCR Provider: Gemini Vision');
      return geminiVisionOcrProvider;
    }

    // Auto mode
    const endpoint = configService.get<string>('AZURE_OCR_ENDPOINT');
    const key = configService.get<string>('AZURE_OCR_KEY');

    if (endpoint && key) {
      logger.log('OCR Provider: Azure Document Intelligence');
      return azureOcrProvider;
    } else {
      logger.warn('Azure OCR credentials not found.\nUsing Gemini Vision OCR.');
      return geminiVisionOcrProvider;
    }
  },
  inject: [ConfigService, AzureOCRProvider, GeminiVisionOCRProvider],
};
