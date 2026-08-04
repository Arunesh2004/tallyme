import { Test, TestingModule } from '@nestjs/testing';
import { GeminiVisionOCRProvider } from './gemini-vision-ocr.provider';
import { GeminiClientService } from './gemini-client.service';
import { Logger } from '@nestjs/common';

describe('GeminiVisionOCRProvider', () => {
  let provider: GeminiVisionOCRProvider;
  let geminiClient: any;

  beforeEach(async () => {
    geminiClient = {
      model: 'gemini-1.5-pro',
      ai: {
        models: {
          generateContent: jest.fn(),
        }
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiVisionOCRProvider,
        { provide: GeminiClientService, useValue: geminiClient },
        Logger
      ],
    }).compile();

    provider = module.get<GeminiVisionOCRProvider>(GeminiVisionOCRProvider);
  });

  describe('extractText', () => {
    it('should successfully extract text from image', async () => {
      geminiClient.ai.models.generateContent.mockResolvedValueOnce({
        text: 'Extracted text from image',
      });

      const buffer = Buffer.from('test');
      const result = await provider.extractText(buffer, { mimeType: 'image/jpeg' });
      
      expect(result.text).toBe('Extracted text from image');
      expect(result.metadata?.provider).toBe('gemini-vision-ocr');
    });

    it('should handle missing mimeType', async () => {
      geminiClient.ai.models.generateContent.mockResolvedValueOnce({
        text: 'Extracted text',
      });

      const buffer = Buffer.from('test');
      // No mime type provided
      const result = await provider.extractText(buffer);
      
      expect(result.text).toBe('Extracted text');
    });
    
    it('should handle empty text response', async () => {
      geminiClient.ai.models.generateContent.mockResolvedValueOnce({
        text: '',
      });

      const buffer = Buffer.from('test');
      await expect(provider.extractText(buffer)).rejects.toThrow('No content returned from Gemini Vision OCR');
    });

    it('should handle client error', async () => {
      geminiClient.ai.models.generateContent.mockRejectedValueOnce(new Error('Gemini vision error'));
      
      const buffer = Buffer.from('test');
      await expect(provider.extractText(buffer, { mimeType: 'image/png' })).rejects.toThrow('Gemini vision error');
    });
  });
});
