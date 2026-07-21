// src/shared/observability/logger/redaction.utils.ts
export class LogRedactor {
  private static readonly PATTERNS = [
    {
      regex: /(password)["']?\s*:\s*["']([^"']+)["']/gi,
      replace: '$1: "***REDACTED***"',
    },
    {
      regex: /(token)["']?\s*:\s*["']([^"']+)["']/gi,
      replace: '$1: "***REDACTED***"',
    },
    {
      regex: /(secret)["']?\s*:\s*["']([^"']+)["']/gi,
      replace: '$1: "***REDACTED***"',
    },
    {
      regex: /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/g,
      replace: '***GSTIN_REDACTED***',
    },
  ];

  static redact(message: string | object): string {
    let str = typeof message === 'string' ? message : JSON.stringify(message);
    for (const pattern of this.PATTERNS) {
      str = str.replace(pattern.regex, pattern.replace);
    }
    return str;
  }
}

// Interceptor to ensure HTTP logs are redacted
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ILogger } from './index';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: ILogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body } = req;

    this.logger.info(`Incoming Request`, {
      method,
      url,
      body: LogRedactor.redact(body),
    });

    const now = Date.now();
    return next.handle().pipe(
      tap(() =>
        this.logger.info(`Outgoing Response`, {
          method,
          url,
          duration: Date.now() - now,
        }),
      ),
    );
  }
}
