import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ApprovalWorkflowEngine } from './approval-workflow.engine';
import { v4 as uuidv4 } from 'uuid';

import { AccountingDecisionAuditService } from '../decision-audit/accounting-decision-audit.service';

@Injectable()
export class BulkApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalEngine: ApprovalWorkflowEngine,
    private readonly auditService: AccountingDecisionAuditService,
  ) {}

  async approveBatch(batchIdParam: string, approvedBy: string) {
    const batch = await this.prisma.approvalBatch.findUnique({
      where: { id: batchIdParam }, // Wait, the input is ApprovalBatch ID
    });

    if (!batch) {
      throw new Error('Approval Batch not found');
    }

    await this.auditService.logDecision({
      companyId: 'SYSTEM',
      inputData: { batchId: batch.id },
      appliedRules: [{ rule: 'BULK_APPROVAL_STARTED', passed: true }],
      confidence: 100,
    });

    const requests = await this.prisma.approvalRequest.findMany({
      where: { status: 'PENDING' }, // Fetch pending ApprovalRequests
    });

    let successful = 0;
    let failed = 0;

    for (const req of requests) {
      try {
        await this.approvalEngine.approve(req.id, approvedBy);
        await this.auditService.logDecision({
          companyId: req.companyId || 'SYSTEM',
          inputData: { requestId: req.id },
          appliedRules: [{ rule: 'REQUEST_APPROVED', passed: true }],
          confidence: 100,
        });
        successful++;
      } catch (err) {
        failed++;
      }
    }

    const newStatus =
      failed > 0 ? (successful > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED';

    await this.prisma.approvalBatch.update({
      where: { id: batch.id },
      data: {
        totalRequests: requests.length,
        approvedCount: successful,
        failedCount: failed,
        completedAt: new Date(),
        status: newStatus,
      },
    });

    await this.auditService.logDecision({
      companyId: 'SYSTEM',
      inputData: { batchId: batch.id },
      appliedRules: [{ rule: 'BULK_APPROVAL_COMPLETED', passed: true }],
      confidence: 100,
    });

    return { batchId: batch.id, total: requests.length, successful, failed };
  }

  async rejectBatch(batchIdParam: string, rejectedBy: string) {
    const batch = await this.prisma.approvalBatch.findUnique({
      where: { id: batchIdParam },
    });

    if (!batch) {
      throw new Error('Approval Batch not found');
    }

    await this.auditService.logDecision({
      companyId: 'SYSTEM',
      inputData: { batchId: batch.id },
      appliedRules: [{ rule: 'BULK_APPROVAL_STARTED', passed: true }],
      confidence: 100,
    });

    const requests = await this.prisma.approvalRequest.findMany({
      where: { status: 'PENDING' }, // Fetch pending ApprovalRequests
    });

    let successful = 0;
    let failed = 0;

    for (const req of requests) {
      try {
        await this.approvalEngine.reject(req.id, rejectedBy);
        await this.auditService.logDecision({
          companyId: req.companyId || 'SYSTEM',
          inputData: { requestId: req.id },
          appliedRules: [{ rule: 'REQUEST_REJECTED', passed: true }],
          confidence: 100,
        });
        successful++;
      } catch (err) {
        failed++;
      }
    }

    const newStatus =
      failed > 0 ? (successful > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED';

    await this.prisma.approvalBatch.update({
      where: { id: batch.id },
      data: {
        totalRequests: requests.length,
        rejectedCount: successful,
        failedCount: failed,
        completedAt: new Date(),
        status: newStatus,
      },
    });

    await this.auditService.logDecision({
      companyId: 'SYSTEM',
      inputData: { batchId: batch.id },
      appliedRules: [{ rule: 'BULK_APPROVAL_COMPLETED', passed: true }],
      confidence: 100,
    });

    return { batchId: batch.id, total: requests.length, successful, failed };
  }
}
