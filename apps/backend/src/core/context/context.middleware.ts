import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';
import {
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
} from '../logger/logger.constants';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) || crypto.randomUUID();
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string) || crypto.randomUUID();

    RequestContextService.run({ correlationId, requestId }, () => {
      next();
    });
  }
}
