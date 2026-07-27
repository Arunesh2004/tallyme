import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('--- OCR DI CHECK ---');
  
  const ocrProvider = app.get('OCRProvider', { strict: false });
  console.log('OCRProvider resolved to:', ocrProvider.constructor.name);

  const aiExtractor = app.get('AIExtractor', { strict: false });
  console.log('AIExtractor resolved to:', aiExtractor.constructor.name);
  
  console.log('--------------------');
  
  // Test failure gracefully
  try {
    await ocrProvider.extractText(Buffer.from('dummy'));
  } catch (err: any) {
    console.log('Expected error without credentials:', err.message);
  }

  await app.close();
}
bootstrap();
