import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AzureOCRProvider } from './providers/azure-ocr.provider';
import { GeminiVisionOCRProvider } from './providers/gemini-vision-ocr.provider';
import { FailoverOCRProvider } from './providers/failover-ocr.provider';
import { PrometheusService } from '../../shared/observability/metrics/prometheus.service';

export const ocrProviderFactory = {
  provide: 'OCRProvider',
  useFactory: (
    configService: ConfigService,
    azureOcrProvider: AzureOCRProvider,
    geminiVisionOcrProvider: GeminiVisionOCRProvider,
  ) => {
    const logger = new Logger('OCRProviderFactory');
    const providerConfig = (configService.get<string>('OCR_PROVIDER') || 'auto')
      .trim()
      .toLowerCase();

    // Check available providers
    const endpoint = configService.get<string>('AZURE_OCR_ENDPOINT');
    const key = configService.get<string>('AZURE_OCR_KEY');
    const azureConfigured = !!(endpoint && key);
    
    const geminiKey = configService.get<string>('ai.apiKey');
    const geminiConfigured = !!geminiKey;

    if (providerConfig === 'azure') {
      if (!azureConfigured) {
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

    // Auto mode - implement failover
    const activeProviders: { name: string; provider: any }[] = [];
    
    if (geminiConfigured) {
      activeProviders.push({ name: 'gemini', provider: geminiVisionOcrProvider });
    }
    if (azureConfigured) {
      activeProviders.push({ name: 'azure', provider: azureOcrProvider });
    }
    
    if (activeProviders.length === 0) {
      logger.warn('No OCR providers are fully configured. Defaulting to Gemini with dummy keys.');
      activeProviders.push({ name: 'gemini', provider: geminiVisionOcrProvider });
    } else if (activeProviders.length > 1) {
      logger.log(`OCR Provider Auto mode: configured with failover [${activeProviders.map(p => p.name).join(' -> ')}]`);
    } else {
      logger.log(`OCR Provider Auto mode: only ${activeProviders[0].name} is configured (failover unavailable).`);
    }

    return new FailoverOCRProvider(activeProviders);
  },
  inject: [ConfigService, AzureOCRProvider, GeminiVisionOCRProvider],
};
