import { initializeTracing } from './bootstrap/tracing';
initializeTracing();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { configureApp } from './bootstrap/configure-app';
import { configureLogging } from './bootstrap/configure-logging';
import { configureValidation } from './bootstrap/configure-validation';
import { configureOpenAPI } from './bootstrap/configure-openapi';
import { LoggerService } from './core/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    // Expose raw body buffer for Stripe/Gmail webhooks
    rawBody: true,
  });

  // 1. Helmet (Security Headers & CSP)
  app.use(helmet());

  // 2. CORS (Environment based)
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: isProd ? process.env.FRONTEND_URL : 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Validation Pipe (Strict)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  configureApp(app);
  configureLogging(app);
  configureValidation(app);
  configureOpenAPI(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;

  const logger = app.get(LoggerService);

  if (process.env.WORKER_MODE === 'true') {
    await app.init();
    logger.log(`🚀 Worker node is running (HTTP server disabled)`, 'Bootstrap');
  } else {
    await app.listen(port);
    logger.log(`🚀 Application is running on port: ${port}`, 'Bootstrap');
  }
}
bootstrap();
