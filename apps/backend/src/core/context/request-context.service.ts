import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  tenantId?: string;
}

@Injectable()
export class RequestContextService {
  private static als = new AsyncLocalStorage<RequestContext>();

  static run(context: RequestContext, callback: () => void) {
    this.als.run(context, callback);
  }

  static getContext(): RequestContext | undefined {
    return this.als.getStore();
  }

  static getCorrelationId(): string | undefined {
    return this.getContext()?.correlationId;
  }
}
