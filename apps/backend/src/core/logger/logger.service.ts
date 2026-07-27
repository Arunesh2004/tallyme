import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly pino: Logger) {}

  log(message: any, context?: string) {
    this.pino.log(message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.pino.error(message, trace, context);
  }

  warn(message: any, context?: string) {
    this.pino.warn(message, context);
  }

  debug(message: any, context?: string) {
    this.pino.debug(message, context);
  }

  verbose(message: any, context?: string) {
    this.pino.verbose(message, context);
  }
}
