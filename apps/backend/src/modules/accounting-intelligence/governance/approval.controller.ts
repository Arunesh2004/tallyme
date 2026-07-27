import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ApprovalWorkflowEngine } from './approval-workflow.engine';
import { AccountingDecisionAuditService } from '../decision-audit/accounting-decision-audit.service';

@Controller('accounting-intelligence/approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalEngine: ApprovalWorkflowEngine,
    private readonly auditService: AccountingDecisionAuditService,
  ) {}

  @Get('dashboard')
  async getApprovalDashboard(@Req() req: any) {
    const status = req.query.status as string;
    const type = req.query.type as string;

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const allRequests = await this.prisma.approvalRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const pending = allRequests.filter((r) => r.status === 'PENDING');

    // We assume ROLLBACK_EXECUTION is high risk or we look for blocked rollback type
    const highRisk = allRequests.filter(
      (r) => r.type === 'ROLLBACK_EXECUTION' || r.type === 'MASTER_DELETION',
    );

    const migrationApprovals = allRequests.filter(
      (r) => r.type === 'MIGRATION_EXECUTION' || r.type === 'MIGRATION_PLAN',
    );
    const transactionApprovals = allRequests.filter(
      (r) => r.type === 'VOUCHER_SYNC' || r.type === 'DOCUMENT_PROCESSING',
    );

    return {
      pendingApprovals: pending.length,
      highRiskApprovals: highRisk.length,
      migrationApprovals: migrationApprovals.length,
      transactionApprovals: transactionApprovals.length,
      items: allRequests.slice(0, 50), // Return latest 50 for dashboard list
    };
  }

  @Get()
  async getPendingApprovals() {
    return this.prisma.approvalRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post(':id/approve')
  async approveRequest(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub || 'UNKNOWN_USER';

    await this.approvalEngine.approve(id, userId);

    // Log individual API approval event
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });
    if (request) {
      await this.auditService.logDecision({
        companyId: request.companyId || 'SYSTEM',
        inputData: { requestId: id, action: 'API_APPROVE', user: userId },
        appliedRules: [{ rule: 'MANUAL_API_APPROVAL', passed: true }],
        confidence: 100,
      });
    }

    return { success: true, message: 'Request approved successfully.' };
  }

  @Post(':id/reject')
  async rejectRequest(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub || 'UNKNOWN_USER';

    await this.approvalEngine.reject(id, userId);

    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });
    if (request) {
      await this.auditService.logDecision({
        companyId: request.companyId || 'SYSTEM',
        inputData: { requestId: id, action: 'API_REJECT', user: userId },
        appliedRules: [{ rule: 'MANUAL_API_REJECTION', passed: true }],
        confidence: 100,
      });
    }

    return { success: true, message: 'Request rejected successfully.' };
  }
}
