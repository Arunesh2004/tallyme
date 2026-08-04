import { Test, TestingModule } from '@nestjs/testing';
import { GeminiExtractionProvider } from './gemini-extraction.provider';
import { GeminiClientService } from './gemini-client.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

describe('GeminiExtractionProvider', () => {
  let provider: GeminiExtractionProvider;
  let geminiClient: any;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    geminiClient = {
      model: 'gemini-1.5-pro',
      ai: {
        models: {
          generateContent: jest.fn(),
        }
      }
    };

    configService = {
      get: jest.fn().mockReturnValue('fake-key'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiExtractionProvider,
        { provide: GeminiClientService, useValue: geminiClient },
        { provide: ConfigService, useValue: configService },
        Logger
      ],
    }).compile();

    provider = module.get<GeminiExtractionProvider>(GeminiExtractionProvider);
  });

  describe('extractInvoiceFields', () => {
    it('should extract data successfully', async () => {
      const mockExtractedData = {
        vendorName: 'Test Vendor',
        gstin: '36TESTGSTIN1234',
        totalAmount: 100.5,
        invoiceNumber: 'INV-123',
        invoiceDate: '2026-08-01',
      };
      
      geminiClient.ai.models.generateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockExtractedData),
      });

      const buffer = Buffer.from('test');
      const result = await provider.extractInvoiceFields('OCR Text', buffer, 'image/jpeg');
      
      expect(result.vendorName).toBe('Test Vendor');
      expect(result.invoiceNumber).toBe('INV-123');
      expect(result.invoiceDate).toBeInstanceOf(Date);
    });

    it('should throw error if AI_API_KEY is missing', async () => {
      configService.get.mockReturnValueOnce(null);
      await expect(provider.extractInvoiceFields('OCR')).rejects.toThrow('AI_API_KEY is not configured');
    });

    it('should handle missing text response', async () => {
      geminiClient.ai.models.generateContent.mockResolvedValueOnce({
        text: '',
      });

      const buffer = Buffer.from('test');
      await expect(provider.extractInvoiceFields('OCR Text', buffer, 'image/jpeg')).rejects.toThrow('No content received from Gemini');
    });

    it('should handle client error', async () => {
      geminiClient.ai.models.generateContent.mockRejectedValueOnce(new Error('Gemini error'));
      
      const buffer = Buffer.from('test');
      await expect(provider.extractInvoiceFields('OCR', buffer, 'image/jpeg')).rejects.toThrow('Gemini error');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      geminiClient.ai.models.generateContent.mockResolvedValueOnce({
        text: 'TALLYME_AI_OK',
        modelVersion: 'gemini-1.5-pro',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5
        }
      });

      const result = await provider.testConnection();
      expect(result.status).toBe(200);
      expect(result.rawResponse).toBe('TALLYME_AI_OK');
    });

    it('should handle test connection failure', async () => {
      geminiClient.ai.models.generateContent.mockRejectedValueOnce(new Error('Connection failed'));
      await expect(provider.testConnection()).rejects.toThrow('Connection failed');
    });
  });
});
