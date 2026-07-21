import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const startTime = Date.now();
    const method = req.method;
    const url = req.originalUrl;

    return next.handle().pipe(
      tap(() => {
        const response = ctx.getResponse();
        const delay = Date.now() - startTime;
        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${delay}ms`,
          'HTTP',
        );
      }),
    );
  }
}
