import { Test, TestingModule } from '@nestjs/testing';
import { AzureOCRProvider } from './azure-ocr.provider';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Mock the DocumentAnalysisClient
jest.mock('@azure/ai-form-recognizer', () => {
  return {
    DocumentAnalysisClient: jest.fn().mockImplementation(() => {
      return {
        beginAnalyzeDocument: jest.fn().mockResolvedValue({
          pollUntilDone: jest.fn().mockResolvedValue({
            content: 'Mocked Azure OCR Text',
          }),
        }),
      };
    }),
    AzureKeyCredential: jest.fn(),
  };
});

describe('AzureOCRProvider', () => {
  let provider: AzureOCRProvider;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'AZURE_OCR_ENDPOINT') return 'https://test-azure.endpoint';
        if (key === 'AZURE_OCR_KEY') return 'test-key';
        return null;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureOCRProvider,
        { provide: ConfigService, useValue: configService },
        Logger
      ],
    }).compile();

    provider = module.get<AzureOCRProvider>(AzureOCRProvider);
  });

  describe('extractText', () => {
    it('should successfully extract text from image', async () => {
      const buffer = Buffer.from('test');
      const result = await provider.extractText(buffer, { mimeType: 'image/jpeg' });
      
      expect(result.text).toBe('Mocked Azure OCR Text');
      expect(result.metadata?.provider).toBe('azure-document-intelligence');
    });

    it('should handle uninitialized client', async () => {
      // Create a provider without keys
      const emptyConfig = { get: jest.fn(() => null) } as any;
      const noKeyProvider = new AzureOCRProvider(emptyConfig);
      
      const buffer = Buffer.from('test');
      await expect(noKeyProvider.extractText(buffer)).rejects.toThrow('Azure DocumentAnalysisClient is not initialized');
    });

    it('should handle azure error', async () => {
      // Force an error
      (provider as any).client = {
        beginAnalyzeDocument: jest.fn().mockRejectedValue(new Error('Azure failed')),
      };
      
      const buffer = Buffer.from('test');
      await expect(provider.extractText(buffer)).rejects.toThrow('Azure failed');
    });
  });
});
