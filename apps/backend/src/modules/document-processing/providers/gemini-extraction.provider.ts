import { Injectable, Logger } from '@nestjs/common';
import { AIExtractor, InvoiceExtractionResult } from './ai-extractor.interface';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { GeminiClientService } from './gemini-client.service';
import { DateParserUtil } from '../../../shared/utils/date-parser.util';

@Injectable()
export class GeminiExtractionProvider implements AIExtractor {
  private readonly logger = new Logger(GeminiExtractionProvider.name);
  private ai: GoogleGenAI;
  private model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiClient: GeminiClientService,
  ) {
    this.ai = this.geminiClient.ai;
    this.model = this.geminiClient.model;
  }

  async extractInvoiceFields(rawText: string): Promise<InvoiceExtractionResult> {
    const apiKey = this.configService.get<string>('ai.apiKey');
    if (!apiKey) {
      throw new Error('AI_API_KEY is not configured');
    }

    try {
      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          vendorName: { type: Type.STRING, nullable: true },
          gstin: { type: Type.STRING, nullable: true },
          invoiceNumber: { type: Type.STRING, nullable: true },
          invoiceDate: { type: Type.STRING, nullable: true, description: 'Format: YYYY-MM-DD' },
          subtotal: { type: Type.NUMBER, nullable: true },
          taxAmount: { type: Type.NUMBER, nullable: true },
          amount: { type: Type.NUMBER, nullable: true },
          confidence: { type: Type.NUMBER },
        },
      };

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { role: 'user', parts: [{ text: `Extract the invoice details from the following OCR text:\n\n${rawText}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('No content received from Gemini');
      }

      const result = JSON.parse(text);
      return {
        vendorName: result.vendorName || null,
        gstin: result.gstin || null,
        invoiceNumber: result.invoiceNumber || null,
        invoiceDate: DateParserUtil.parse(result.invoiceDate),
        amount: result.amount || result.totalAmount || null,
        taxAmount: result.taxAmount || null,
        lineItems: [],
        confidence: result.confidence || result.confidenceScore || 0,
        confidenceFactors: {}
      };
    } catch (error: any) {
      this.logger.error(`Gemini extraction failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async testConnection(): Promise<any> {
    const start = Date.now();
    try {
      console.log('Executing testConnection() with model:', this.model);
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: 'Reply ONLY with: TALLYME_AI_OK'
      });
      const latency = Date.now() - start;
      return {
        status: 200,
        model: response.modelVersion || this.model,
        latency,
        tokenUsage: {
          input: response.usageMetadata?.promptTokenCount,
          output: response.usageMetadata?.candidatesTokenCount
        },
        rawResponse: response.text
      };
    } catch (error: any) {
      this.logger.error(`Test Connection failed: ${error.message}`, error.stack);
      console.log('ERROR JSON:', JSON.stringify(error, null, 2));
      throw error;
    }
  }
}
