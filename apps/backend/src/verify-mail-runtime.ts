import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Booting NestJS application...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  console.log('Application Context successfully initialized. DI graph is completely valid.');
  await app.close();
  console.log('Shutting down. Test passed.');
}

bootstrap().catch((err) => {
  console.error('NestJS failed to boot:', err);
  process.exit(1);
});
