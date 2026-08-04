import { ocrProviderFactory } from './ocr-provider.factory';
import { ConfigService } from '@nestjs/config';
import { AzureOCRProvider } from './providers/azure-ocr.provider';
import { GeminiVisionOCRProvider } from './providers/gemini-vision-ocr.provider';

describe('ocrProviderFactory', () => {
  const mockConfigService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const mockAzureProvider = {} as AzureOCRProvider;
  const mockGeminiProvider = {} as GeminiVisionOCRProvider;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have correct provider token', () => {
    expect(ocrProviderFactory.provide).toBe('OCRProvider');
  });

  it('should return azure provider if OCR_PROVIDER is azure and keys exist', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key) => {
      if (key === 'OCR_PROVIDER') return 'azure';
      if (key === 'AZURE_OCR_ENDPOINT') return 'endpoint';
      if (key === 'AZURE_OCR_KEY') return 'key';
      return null;
    });

    const result = ocrProviderFactory.useFactory(mockConfigService, mockAzureProvider, mockGeminiProvider);
    expect(result).toBe(mockAzureProvider);
  });

  it('should throw error if OCR_PROVIDER is azure but keys missing', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key) => {
      if (key === 'OCR_PROVIDER') return 'azure';
      return null;
    });

    expect(() => ocrProviderFactory.useFactory(mockConfigService, mockAzureProvider, mockGeminiProvider))
      .toThrow('OCR_PROVIDER is set to azure, but AZURE_OCR_ENDPOINT or AZURE_OCR_KEY is missing.');
  });

  it('should return gemini provider if OCR_PROVIDER is gemini', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key) => {
      if (key === 'OCR_PROVIDER') return 'gemini';
      return null;
    });

    const result = ocrProviderFactory.useFactory(mockConfigService, mockAzureProvider, mockGeminiProvider);
    expect(result).toBe(mockGeminiProvider);
  });

  it('should default to azure if OCR_PROVIDER is auto and azure keys exist', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key) => {
      if (key === 'OCR_PROVIDER') return 'auto';
      if (key === 'AZURE_OCR_ENDPOINT') return 'endpoint';
      if (key === 'AZURE_OCR_KEY') return 'key';
      return null;
    });

    const result = ocrProviderFactory.useFactory(mockConfigService, mockAzureProvider, mockGeminiProvider);
    expect(result.constructor.name).toBe('FailoverOCRProvider');
  });

  it('should fallback to gemini if OCR_PROVIDER is auto but azure keys missing', () => {
    (mockConfigService.get as jest.Mock).mockImplementation((key) => {
      if (key === 'OCR_PROVIDER') return 'auto';
      return null;
    });

    const result = ocrProviderFactory.useFactory(mockConfigService, mockAzureProvider, mockGeminiProvider);
    expect(result.constructor.name).toBe('FailoverOCRProvider');
  });
});
