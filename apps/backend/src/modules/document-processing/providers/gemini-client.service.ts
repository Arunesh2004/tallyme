import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiClientService {
  private readonly logger = new Logger(GeminiClientService.name);
  public readonly ai: GoogleGenAI;
  public readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.apiKey');
    this.model = this.configService.get<string>('ai.model') || 'models/gemini-flash-lite-latest';
    
    if (!apiKey) {
      this.logger.warn('AI_API_KEY is missing. Gemini calls will fail.');
    }
    
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'fake-key' });
    
    console.log('--- GEMINI CONFIG CHECK ---');
    console.log('AI_API_KEY Configured:', !!apiKey);
    console.log('AI_API_KEY Starts With:', apiKey ? apiKey.substring(0, 5) : 'N/A');
    console.log('AI_MODEL:', this.model);
    console.log('---------------------------');
  }
}
