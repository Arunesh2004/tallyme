import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class AuditTimelineService {
  private readonly logger = new Logger(AuditTimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTimeline(entityId: string) {
    const timeline: any[] = [];

    // 1. Check Document Lifecycle (if entityId belongs to a document/invoice)
    const document = await this.prisma.document.findUnique({
      where: { id: entityId },
    });
    if (document) {
      timeline.push({
        timestamp: document.receivedAt,
        event: 'Document Uploaded',
        details: { status: document.status },
      });
    }

    // 2. AI Extraction / Accounting Decisions
    const decisions = await this.prisma.accountingDecisionLog.findMany({
      where: { inputData: { equals: { documentId: entityId } } },
      orderBy: { timestamp: 'asc' },
    });

    decisions.forEach((d) => {
      timeline.push({
        timestamp: d.timestamp,
        event: 'AI Extraction Completed',
        details: { confidence: d.confidence, rules: d.appliedRules },
      });
    });

    // 3. Approvals
    const approvals = await this.prisma.approvalRequest.findMany({
      where: { entityId },
      orderBy: { createdAt: 'asc' },
    });

    approvals.forEach((a) => {
      timeline.push({
        timestamp: a.createdAt,
        event: 'Approval Requested',
        details: { type: a.type, reason: a.reason },
      });
      if (a.resolvedAt) {
        timeline.push({
          timestamp: a.resolvedAt,
          event: `Approval ${a.status}`,
          details: { approvedBy: a.approvedBy },
        });
      }
    });

    // 4. Voucher Synchronization
    const vouchers = await this.prisma.voucherCandidate.findMany({
      where: { id: entityId }, // if entityId maps to voucher
    });

    vouchers.forEach((v: any) => {
      timeline.push({
        timestamp: v.date,
        event: 'Voucher Generated',
        details: null,
      });
      if (v.status === 'SYNCED') {
        timeline.push({
          timestamp: new Date(),
          event: 'Synced To Tally',
          details: null,
        });
        timeline.push({
          timestamp: new Date(),
          event: 'Verified',
          details: null,
        });
      }
    });

    // Sort all gathered events chronologically
    timeline.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return timeline;
  }
}
