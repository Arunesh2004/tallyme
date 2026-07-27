import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  
  console.log('--- CONFIG SERVICE DEBUG ---');
  console.log('ai.provider:', config.get('ai.provider'));
  console.log('ai.apiKey starts with:', config.get('ai.apiKey')?.substring(0, 5));
  console.log('ai.model:', config.get('ai.model'));
  console.log('raw process.env.AI_API_KEY:', process.env.AI_API_KEY?.substring(0, 5));
  console.log('----------------------------');
  
  await app.close();
}
bootstrap();
