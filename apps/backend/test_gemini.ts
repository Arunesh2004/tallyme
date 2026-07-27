import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { GeminiExtractionProvider } from './src/modules/document-processing/providers/gemini-extraction.provider';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const geminiProvider = app.get('AIExtractor', { strict: false });
  
  console.log('Testing Gemini Connection...');
  const result = await geminiProvider.testConnection();
  console.log(JSON.stringify(result, null, 2));
  
  await app.close();
}
bootstrap();
