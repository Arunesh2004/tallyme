import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('VerifyOCR');
  logger.log(`Testing with OCR_PROVIDER=${process.env.OCR_PROVIDER}`);
  
  try {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const ocrProvider = app.get('OCRProvider', { strict: false });
    console.log('>>> RESOLVED PROVIDER:', ocrProvider.constructor.name);
    await app.close();
  } catch (error: any) {
    console.log('>>> ERROR:', error.message);
  }
}
bootstrap();
