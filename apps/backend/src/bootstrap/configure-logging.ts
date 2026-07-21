import { INestApplication } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { LoggerService } from '../core/logger/logger.service';
import { LoggerInterceptor } from '../core/logger/logger.interceptor';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';

export const configureLogging = (app: INestApplication) => {
  // Use nestjs-pino as the underlying Nest logger
  const pinoLogger = app.get(Logger);
  app.useLogger(pinoLogger);

  // But expose our custom LoggerService globally for filters and interceptors
  const loggerService = app.get(LoggerService);

  app.useGlobalInterceptors(new LoggerInterceptor(loggerService));
  app.useGlobalFilters(new GlobalExceptionFilter(loggerService));
};
