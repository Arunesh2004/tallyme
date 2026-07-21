import { Injectable, Module, Global } from '@nestjs/common';
import { CorrelationContext } from '../context';

export interface ILogger {
  trace(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, trace?: string, meta?: any): void;
  fatal(message: string, trace?: string, meta?: any): void;
}

export class Logger implements ILogger {
  constructor(private readonly moduleName: string) {}

  private formatMessage(
    level: string,
    message: string,
    meta?: any,
    trace?: string,
  ) {
    const context = CorrelationContext.get();
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: context?.correlationId || 'N/A',
      module: this.moduleName,
      message,
      meta: this.maskSensitiveData(meta),
      trace,
    };
    return JSON.stringify(payload);
  }

  private maskSensitiveData(meta?: any): any {
    if (!meta) return meta;
    const masked = { ...meta };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apikey',
      'pan',
      'bankaccount',
    ];
    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        masked[key] = '***MASKED***';
      }
    }
    return masked;
  }

  trace(msg: string, meta?: any) {
    process.stdout.write(this.formatMessage('TRACE', msg, meta) + '\n');
  }
  debug(msg: string, meta?: any) {
    process.stdout.write(this.formatMessage('DEBUG', msg, meta) + '\n');
  }
  info(msg: string, meta?: any) {
    process.stdout.write(this.formatMessage('INFO', msg, meta) + '\n');
  }
  warn(msg: string, meta?: any) {
    process.stdout.write(this.formatMessage('WARN', msg, meta) + '\n');
  }
  error(msg: string, trace?: string, meta?: any) {
    process.stderr.write(this.formatMessage('ERROR', msg, meta, trace) + '\n');
  }
  fatal(msg: string, trace?: string, meta?: any) {
    process.stderr.write(this.formatMessage('FATAL', msg, meta, trace) + '\n');
  }
}

@Injectable()
export class LoggerFactory {
  create(moduleName: string): ILogger {
    return new Logger(moduleName);
  }
}

@Global()
@Module({
  providers: [LoggerFactory],
  exports: [LoggerFactory],
})
export class LoggerModule {}
