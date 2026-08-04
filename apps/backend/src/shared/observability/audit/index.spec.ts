import { AuditLogger, AuditEvent } from './index';
import { CorrelationContext } from '../context';
import { ILogger } from '../logger';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
    } as any;
    auditLogger = new AuditLogger(mockLogger);
  });

  it('should log audit event with context', (done) => {
    const event: AuditEvent = {
      actor: 'admin',
      action: 'CREATE',
      entity: 'USER',
      entityId: '123',
      metadata: { role: 'admin' },
    };

    const contextData = { correlationId: 'c-123', tenantId: 't-123' };

    CorrelationContext.run(contextData, () => {
      auditLogger.log(event);
      expect(mockLogger.info).toHaveBeenCalledWith('AUDIT_EVENT', expect.objectContaining({
        type: 'AUDIT',
        correlationId: 'c-123',
        tenantId: 't-123',
        actor: 'admin',
        action: 'CREATE',
        entity: 'USER',
        entityId: '123',
        metadata: { role: 'admin' },
        timestamp: expect.any(String),
      }));
      done();
    });
  });

  it('should log audit event without context', () => {
    const event: AuditEvent = {
      actor: 'system',
      action: 'DELETE',
      entity: 'FILE',
      entityId: '456',
    };

    auditLogger.log(event);
    expect(mockLogger.info).toHaveBeenCalledWith('AUDIT_EVENT', expect.objectContaining({
      type: 'AUDIT',
      correlationId: 'N/A',
      tenantId: 'SYSTEM',
      actor: 'system',
      action: 'DELETE',
      entity: 'FILE',
      entityId: '456',
    }));
  });
});
