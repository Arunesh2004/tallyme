import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { GeminiClientService } from './src/modules/document-processing/providers/gemini-client.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('GeminiTest');
  try {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const gemini = app.get(GeminiClientService);
    
    console.log('Sending request to Gemini...');
    const start = Date.now();
    const response = await gemini.ai.models.generateContent({
      model: gemini.model,
      contents: [{ role: 'user', parts: [{ text: 'Reply ONLY with: TALLYME_FINAL_OK' }] }]
    });
    const latency = Date.now() - start;
    
    console.log(`HTTP Status: 200 (Success)`);
    console.log(`Latency: ${latency}ms`);
    console.log(`Model: ${gemini.model}`);
    if (response.usageMetadata) {
       console.log(`Token usage: ${JSON.stringify(response.usageMetadata)}`);
    } else {
       console.log('Token usage: NOT REPORTED BY SDK');
    }
    console.log(`Raw response: ${response.text}`);
    
    await app.close();
  } catch (error: any) {
    logger.error('Test failed', error);
    process.exit(1);
  }
}
bootstrap();
