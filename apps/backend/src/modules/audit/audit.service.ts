import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PrometheusService } from '../../shared/observability/metrics/prometheus.service';

interface AuditLogPayload {
  action: string;
  userId?: string;
  organizationId?: string;
  companyId?: string;
  entity?: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prometheusService: PrometheusService
  ) {}

  async log(payload: AuditLogPayload) {
    try {
      await this.prisma.auditLog.create({
        data: {
          ...payload,
          oldValue: payload.oldValue ? payload.oldValue : undefined,
          newValue: payload.newValue ? payload.newValue : undefined,
        },
      });
    } catch (error: any) {
      // Swallow audit log errors to prevent business flow interruption,
      // but ideally we should alert on this via telemetry.
      this.prometheusService.auditDropTotal.inc();
      console.error('AuditLog creation failed', error);
    }
  }

  async getTimeline(
    entityId?: string,
    correlationId?: string,
    skip: number = 0,
    take: number = 50,
  ) {
    const where: any = {};
    if (entityId) {
      where.entityId = entityId;
    }
    if (correlationId) {
      where.correlationId = correlationId;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    });
  }

  async logEvent(userId: string, action: string, metadata?: Record<string, any>) {
    await this.log({
      action,
      userId,
      entity: metadata?.entityType,
      entityId: metadata?.periodId || metadata?.queueId || metadata?.documentId,
      newValue: metadata,
    });
  }
}
