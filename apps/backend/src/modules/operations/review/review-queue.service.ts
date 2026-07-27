import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class ReviewQueueService {
  private readonly logger = new Logger(ReviewQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getReviewQueue() {
    const queue = {
      critical: [] as any[],
      high: [] as any[],
      medium: [] as any[],
    };

    // 1. Validation Failures & Low Confidence Extraction (Documents in MANUAL_REVIEW)
    const manualReviewDocs = await this.prisma.document.findMany({
      where: { status: 'MANUAL_REVIEW' },
      orderBy: { receivedAt: 'desc' },
    });

    manualReviewDocs.forEach((doc) => {
      queue.high.push({
        entityId: doc.id,
        entityType: 'DOCUMENT',
        reason: 'Low confidence extraction or validation failure',
        createdAt: doc.receivedAt,
        priority: 'HIGH',
      });
    });

    // 2. Blocked Rollbacks (Approval requests rejected for rollback)
    const blockedRollbacks = await this.prisma.approvalRequest.findMany({
      where: { type: 'ROLLBACK_EXECUTION', status: 'REJECTED' },
      orderBy: { createdAt: 'desc' },
    });

    blockedRollbacks.forEach((br) => {
      queue.critical.push({
        entityId: br.entityId,
        entityType: 'ROLLBACK_EXECUTION',
        reason: br.reason || 'Rollback manually blocked or rejected',
        createdAt: br.createdAt,
        priority: 'CRITICAL',
      });
    });

    // 3. Migration Failures
    const failedMigrations = await this.prisma.migrationExecution.findMany({
      where: { status: { in: ['FAILED', 'PARTIALLY_FAILED'] } },
      orderBy: { executedAt: 'desc' },
    });

    failedMigrations.forEach((fm) => {
      queue.critical.push({
        entityId: fm.id,
        entityType: 'MIGRATION_EXECUTION',
        reason: 'Migration execution failed. Requires intervention.',
        createdAt: fm.executedAt || fm.createdAt,
        priority: 'CRITICAL',
      });
    });

    // 4. Pending Approvals
    const pendingApprovals = await this.prisma.approvalRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    pendingApprovals.forEach((pa) => {
      queue.medium.push({
        entityId: pa.id,
        entityType: 'APPROVAL_REQUEST',
        reason: pa.reason || 'Pending manual approval',
        createdAt: pa.createdAt,
        priority: 'MEDIUM',
      });
    });

    return queue;
  }
}
