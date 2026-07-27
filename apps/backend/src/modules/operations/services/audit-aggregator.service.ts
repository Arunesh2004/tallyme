import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class AuditAggregatorService {
  constructor(private readonly prisma: PrismaService) {}

  async getAggregatedEvents(limit: number = 50) {
    // Phase 8 mandate: DO NOT create duplicate audit storage.
    // Reuse existing audit infrastructure.

    const [vendorAudits, studentAudits, erpTransitions, migrations] =
      await Promise.all([
        this.prisma.vendorSlipAudit.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.studentPaymentAudit.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.eRPSyncHistory.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { job: true },
        }),
        this.prisma.migrationHistory.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const events: {
      timestamp: Date;
      module: string;
      event: string;
      result: string;
      user: string;
      correlationId: string;
    }[] = [];

    vendorAudits.forEach((a) => {
      events.push({
        timestamp: a.createdAt,
        module: 'Vendor Slip Workflow',
        event: a.action,
        result: 'SUCCESS',
        user: 'System',
        correlationId: a.documentId,
      });
    });

    studentAudits.forEach((a) => {
      events.push({
        timestamp: a.createdAt,
        module: 'Student Fee Workflow',
        event: a.action,
        result: 'SUCCESS',
        user: 'System',
        correlationId: a.documentId,
      });
    });

    erpTransitions.forEach((t) => {
      events.push({
        timestamp: t.createdAt,
        module: 'ERP Sync',
        event: `State changed: ${t.statusFrom} -> ${t.statusTo}`,
        result: t.statusTo.includes('FAIL') ? 'FAILED' : 'SUCCESS',
        user: 'Worker',
        correlationId: t.job.voucherCandidateId,
      });
    });

    migrations.forEach((m) => {
      events.push({
        timestamp: m.createdAt,
        module: 'Tally Organization',
        event: `${m.operation} ${m.objectType} ${m.objectName}`,
        result: m.status,
        user: m.performedBy || 'Admin',
        correlationId: m.migrationId,
      });
    });

    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
