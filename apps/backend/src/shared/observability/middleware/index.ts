import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CorrelationContext, CorrelationIdProvider } from '../context';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private readonly correlationIdProvider: CorrelationIdProvider) {}

  use(req: Request, res: Response, next: NextFunction) {
    const existingId = req.header('x-correlation-id');
    const correlationId = existingId || this.correlationIdProvider.generate();

    // Propagate ID back to the client
    res.setHeader('x-correlation-id', correlationId);

    const contextData = {
      correlationId,
      requestId: crypto.randomUUID(),
      tenantId: req.header('x-tenant-id') || 'DEFAULT',
    };

    CorrelationContext.run(contextData, () => {
      next();
    });
  }
}
