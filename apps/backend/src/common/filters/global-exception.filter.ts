import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService } from '../../core/logger/logger.service';
import { ProblemDetailsFactory } from './problem-details.factory';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const problemDetails = ProblemDetailsFactory.createFromException(
      exception,
      request,
    );

    if (problemDetails.status >= 500) {
      this.logger.error(
        'Unhandled Exception',
        exception instanceof Error ? exception.stack : undefined,
        'GlobalExceptionFilter',
      );
    }

    response.status(problemDetails.status).json(problemDetails);
  }
}
