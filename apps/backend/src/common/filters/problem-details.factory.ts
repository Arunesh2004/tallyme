import { HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';

export class ProblemDetailsFactory {
  static createFromException(exception: unknown, request: Request) {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal Server Error';

    const detail =
      typeof errorResponse === 'object' &&
      errorResponse !== null &&
      'message' in errorResponse
        ? (errorResponse as any).message
        : errorResponse;

    return {
      type: `https://httpstatuses.com/${status}`,
      title:
        exception instanceof HttpException
          ? exception.name
          : 'Internal Server Error',
      status,
      detail: Array.isArray(detail) ? detail.join(', ') : detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };
  }
}
