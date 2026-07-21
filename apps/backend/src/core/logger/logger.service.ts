import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly pino: Logger) {}

  log(message: any, context?: string) {
    this.pino.log({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.pino.error({ context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.pino.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.pino.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.pino.verbose({ context }, message);
  }
}
