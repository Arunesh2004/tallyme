import { Injectable } from '@nestjs/common';
import { CorrelationContext } from '../context';
import { ILogger } from '../logger';

export interface AuditMetadata {
  [key: string]: any;
}

export interface AuditEvent {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: AuditMetadata;
}

@Injectable()
export class AuditLogger {
  constructor(private readonly logger: ILogger) {}

  log(event: AuditEvent): void {
    const context = CorrelationContext.get();
    const payload = {
      type: 'AUDIT',
      timestamp: new Date().toISOString(),
      correlationId: context?.correlationId || 'N/A',
      tenantId: context?.tenantId || 'SYSTEM',
      actor: event.actor,
      action: event.action,
      entity: event.entity,
      entityId: event.entityId,
      metadata: event.metadata,
    };

    // Audit logs are structured specifically to be parsed by an external SIEM or immutable ledger
    this.logger.info('AUDIT_EVENT', payload);
  }
}
