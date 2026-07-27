import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
      console.error('AuditLog creation failed', error);
    }
  }

  async getTimeline() {
    // Simulate fetching across modules to build the unified timeline
    return [
      { time: '10:01 AM', action: 'Invoice Uploaded', source: 'Document Sync' },
      { time: '10:02 AM', action: 'OCR Completed', source: 'Extraction Engine' },
      { time: '10:03 AM', action: 'Context Generated', source: 'Reasoning Engine' },
      { time: '10:03 AM', action: 'Knowledge Retrieved (2 rules)', source: 'Reasoning Engine' },
      { time: '10:04 AM', action: 'AI Reasoning Completed', source: 'Reasoning Engine' },
      { time: '10:04 AM', action: 'Explanation Generated', source: 'Reasoning Engine' },
      { time: '10:05 AM', action: 'Recommendation Issued', source: 'AI Agents' },
      { time: '10:05 AM', action: 'Manager Approved', source: 'Human Review' },
      { time: '10:06 AM', action: 'Ledger Created In Tally', source: 'Execution Engine' },
      { time: '10:07 AM', action: 'Validation Passed', source: 'Validation Engine' },
    ];
  }
}
