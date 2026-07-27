import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('BootTest');
  logger.log('Starting boot test...');
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    logger.log('App context created successfully.');
    
    // Log providers
    logger.log('OCR Provider: ' + app.get('OCRProvider', { strict: false }).constructor.name);
    logger.log('AI Provider: ' + app.get('AIExtractor', { strict: false }).constructor.name);
    
    await app.close();
    logger.log('Boot test completed and app closed.');
  } catch (error: any) {
    logger.error('Boot test failed', error);
    process.exit(1);
  }
}
bootstrap();
