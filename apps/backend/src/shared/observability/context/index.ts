import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export type CorrelationId = string;

export interface RequestContextData {
  correlationId: CorrelationId;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  locale?: string;
  timezone?: string;
}

@Injectable()
export class CorrelationContext {
  private static storage = new AsyncLocalStorage<RequestContextData>();

  static run<R>(data: RequestContextData, callback: () => R): R {
    return this.storage.run(data, callback);
  }

  static get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  static getCorrelationId(): CorrelationId | undefined {
    return this.storage.getStore()?.correlationId;
  }
}

@Injectable()
export class CorrelationIdProvider {
  generate(): CorrelationId {
    return crypto.randomUUID();
  }
}

// Re-export as RequestContext for domain use
export const RequestContext = CorrelationContext;
