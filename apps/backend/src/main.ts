import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { configureApp } from './bootstrap/configure-app';
import { configureLogging } from './bootstrap/configure-logging';
import { configureValidation } from './bootstrap/configure-validation';
import { LoggerService } from './core/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  configureApp(app);
  configureLogging(app);
  configureValidation(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;

  await app.listen(port);

  const logger = app.get(LoggerService);
  logger.log(`🚀 Application is running on port: ${port}`, 'Bootstrap');
}
bootstrap();
