import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountingDecisionAuditService } from '../../accounting-intelligence/decision-audit/accounting-decision-audit.service';

@Injectable()
export class ApprovalBatchService {
  private readonly logger = new Logger(ApprovalBatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AccountingDecisionAuditService,
  ) {}

  async createBatch(
    companyId: string,
    transactionIds: string[],
    userId: string,
  ) {
    this.logger.log(
      `Creating approval batch for ${transactionIds.length} items`,
    );
    const batch = await this.prisma.approvalBatch.create({
      data: {
        batchId: `BATCH-${Date.now()}`,
        companyId,
        createdBy: userId,
        status: 'PENDING',
        totalItems: transactionIds.length,
        items: {
          create: transactionIds.map((id) => ({
            transactionId: id,
            status: 'PENDING',
          })),
        },
      },
    });
    return batch;
  }

  async processBatchApproval(
    batchId: string,
    approvals: { transactionId: string; approved: boolean; comment?: string }[],
    userId: string,
  ) {
    const batch = await this.prisma.approvalBatch.findUnique({
      where: { id: batchId },
      include: { items: true },
    });

    if (!batch) throw new Error('Batch not found');

    let approvedCount = batch.approvedItems;
    let rejectedCount = batch.rejectedItems;

    for (const approval of approvals) {
      await this.prisma.approvalBatchItem.updateMany({
        where: { batchId, transactionId: approval.transactionId },
        data: {
          status: approval.approved ? 'APPROVED' : 'REJECTED',
          reviewComment: approval.comment,
          reviewedBy: userId,
        },
      });
      if (approval.approved) approvedCount++;
      else rejectedCount++;
    }

    const newStatus =
      approvedCount + rejectedCount === batch.totalItems
        ? approvedCount === batch.totalItems
          ? 'APPROVED'
          : 'PARTIALLY_APPROVED'
        : 'UNDER_REVIEW';

    const updatedBatch = await this.prisma.approvalBatch.update({
      where: { id: batchId },
      data: {
        approvedItems: approvedCount,
        rejectedItems: rejectedCount,
        status: newStatus,
        approvedBy:
          newStatus === 'APPROVED' || newStatus === 'PARTIALLY_APPROVED'
            ? userId
            : null,
      },
    });

    if (!batch.companyId) throw new Error('Batch is missing companyId');
    await this.auditService.logDecision({
      companyId: batch.companyId,
      userId,
      inputData: { batchId, approvals },
      resolverOutput: { status: newStatus },
      appliedRules: ['BATCH_APPROVAL'],
      ledgerDecision: { status: 'SUCCESS' },
      confidence: 100,
      userOverride: false,
    });

    // If fully approved, trigger Tally Sync logic (handled externally via events or queues in a full setup)
    if (newStatus === 'APPROVED' || newStatus === 'PARTIALLY_APPROVED') {
      this.logger.log(`Batch ${batchId} finalized. Ready for Tally sync.`);
    }

    return updatedBatch;
  }
}
