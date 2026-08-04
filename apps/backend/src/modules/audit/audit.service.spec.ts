import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PrometheusService } from '../../shared/observability/metrics/prometheus.service';

describe('AuditService', () => {
  let service: AuditService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  const mockAuditDropTotal = { inc: jest.fn() };
  const mockPrometheusService = {
    auditDropTotal: mockAuditDropTotal,
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PrometheusService, useValue: mockPrometheusService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      await service.log({ action: 'USER_LOGIN', userId: 'user-1' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'USER_LOGIN',
          userId: 'user-1',
          oldValue: undefined,
          newValue: undefined,
        },
      });
    });

    it('should log with oldValue and newValue when provided', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-2' });

      await service.log({
        action: 'PERIOD_UPDATED',
        entityId: 'period-1',
        oldValue: { status: 'OPEN' },
        newValue: { status: 'LOCKED' },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValue: { status: 'OPEN' },
          newValue: { status: 'LOCKED' },
        }),
      });
    });

    it('should not include oldValue/newValue when they are falsy', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-3' });

      await service.log({ action: 'PING', oldValue: null, newValue: undefined });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValue: undefined,
          newValue: undefined,
        }),
      });
    });

    it('should swallow errors and increment auditDropTotal counter', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await service.log({ action: 'FAIL_ACTION' });

      expect(mockAuditDropTotal.inc).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'AuditLog creation failed',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getTimeline', () => {
    it('should return audit logs ordered by timestamp desc', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'A', timestamp: new Date() },
        { id: 'log-2', action: 'B', timestamp: new Date() },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getTimeline('entity-1', undefined, 0, 50);

      expect(result).toEqual(mockLogs);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { entityId: 'entity-1' },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should filter by correlationId when provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getTimeline(undefined, 'corr-123', 0, 20);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { correlationId: 'corr-123' },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by both entityId and correlationId when both provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.getTimeline('entity-1', 'corr-456', 10, 25);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { entityId: 'entity-1', correlationId: 'corr-456' },
        orderBy: { timestamp: 'desc' },
        skip: 10,
        take: 25,
      });
    });

    it('should return empty results with no filters', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getTimeline();

      expect(result).toEqual([]);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('logEvent', () => {
    it('should call log with correct payload derived from metadata', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-4' });

      await service.logEvent('user-1', 'PERIOD_LOCK', {
        entityType: 'AccountingPeriod',
        periodId: 'period-1',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PERIOD_LOCK',
          userId: 'user-1',
          entity: 'AccountingPeriod',
          entityId: 'period-1',
          newValue: { entityType: 'AccountingPeriod', periodId: 'period-1' },
        }),
      });
    });

    it('should handle logEvent with documentId in metadata', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-5' });

      await service.logEvent('user-2', 'DOC_UPLOAD', {
        entityType: 'Document',
        documentId: 'doc-123',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityId: 'doc-123',
        }),
      });
    });

    it('should handle logEvent with queueId in metadata', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-6' });

      await service.logEvent('user-3', 'QUEUE_PROCESS', {
        entityType: 'Queue',
        queueId: 'queue-456',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityId: 'queue-456',
        }),
      });
    });

    it('should handle logEvent without metadata', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-7' });

      await service.logEvent('user-1', 'SYSTEM_CHECK');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SYSTEM_CHECK',
          userId: 'user-1',
          entity: undefined,
          entityId: undefined,
        }),
      });
    });
  });
});
