import { Controller, Get, Param, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';

@Controller()
export class MonitoringController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
  ) {}

  @Get('erp/status')
  async getErpStatus() {
    const [failedJobs, activeJobs, successJobs] = await Promise.all([
      this.prisma.eRPSyncJob.count({ where: { status: 'FAILED_PERMANENT' } }),
      this.prisma.eRPSyncJob.count({ where: { status: 'SYNCING' } }),
      this.prisma.eRPSyncJob.count({ where: { status: 'SYNCED' } }),
    ]);

    const lastSuccess = await this.prisma.eRPSyncJob.findFirst({
      where: { status: 'SYNCED' },
      orderBy: { updatedAt: 'desc' },
    });

    const lastFailure = await this.prisma.eRPSyncJob.findFirst({
      where: { status: 'FAILED_PERMANENT' },
      orderBy: { updatedAt: 'desc' },
    });

    const queueJobs = await this.queueService.getJobCounts('erp-sync-queue');

    return {
      queueSize: queueJobs.waiting + queueJobs.active,
      workers: 'ONLINE',
      activeJobs: queueJobs.active,
      waitingJobs: queueJobs.waiting,
      failedJobs: queueJobs.failed,
      retryCount: queueJobs.delayed,
      lastSync: lastSuccess?.updatedAt || null,
      lastFailure: lastFailure?.updatedAt || null,
      averageSyncTime: 0, // ms
    };
  }

  @Get('erp/history')
  async getErpHistory() {
    return this.prisma.eRPSyncHistory.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('tally/migrations')
  async getMigrations() {
    return this.prisma.migrationHistory.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('tally/migrations/:id')
  async getMigration(@Param('id') id: string) {
    return this.prisma.migrationHistory.findMany({
      where: { migrationId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('system/workers')
  async getWorkersHealth() {
    const voucherQueue = await this.queueService.getJobCounts(
      'voucher-builder-queue',
    );
    const erpQueue = await this.queueService.getJobCounts('erp-sync-queue');
    const paymentQueue = await this.queueService.getJobCounts(
      'payment-candidate-processing',
    );
    const mailQueue = await this.queueService.getJobCounts(
      'mail-processing-queue',
    );

    return [
      {
        queueName: 'voucher-generation',
        running: true,
        activeJobs: voucherQueue.active,
        waitingJobs: voucherQueue.waiting,
        failedJobs: voucherQueue.failed,
        lastProcessedJob: null,
        lastHeartbeat: new Date().toISOString(),
        status: 'ONLINE',
      },
      {
        queueName: 'erp-sync',
        running: true,
        activeJobs: erpQueue.active,
        waitingJobs: erpQueue.waiting,
        failedJobs: erpQueue.failed,
        lastProcessedJob: null,
        lastHeartbeat: new Date().toISOString(),
        status: 'ONLINE',
      },
      {
        queueName: 'payment-processing',
        running: true,
        activeJobs: paymentQueue.active,
        waitingJobs: paymentQueue.waiting,
        failedJobs: paymentQueue.failed,
        lastProcessedJob: null,
        lastHeartbeat: new Date().toISOString(),
        status: 'ONLINE',
      },
      {
        queueName: 'mail-processing',
        running: true,
        activeJobs: mailQueue.active,
        waitingJobs: mailQueue.waiting,
        failedJobs: mailQueue.failed,
        lastProcessedJob: null,
        lastHeartbeat: new Date().toISOString(),
        status: 'ONLINE',
      },
    ];
  }

  @Get('enterprise/health')
  async getEnterpriseHealth() {
    // Tally Metrics
    const latestDiscovery = await this.prisma.tallyDiscoveryReport.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // Masters Metrics
    const missingLedgers = await this.prisma.approvalRequest.count({
      where: { type: 'PARTY_LEDGER' },
    });
    const missingVendors = await this.prisma.approvalRequest.count({
      where: { type: 'VENDOR_MASTER' },
    });

    // Approval Metrics
    const pendingApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'PENDING' },
    });
    const approvedApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'APPROVED' },
    });
    const rejectedApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'REJECTED' },
    });

    // Synchronization Metrics
    const syncQueued = await this.prisma.eRPSyncJob.count({
      where: { status: 'PENDING' },
    });
    const syncFailed = await this.prisma.eRPSyncJob.count({
      where: { status: 'FAILED_PERMANENT' },
    });
    const syncCompleted = await this.prisma.eRPSyncJob.count({
      where: { status: 'SYNCED' },
    });

    return {
      tally: {
        connection: latestDiscovery
          ? latestDiscovery.status === 'COMPLETED'
            ? 'CONNECTED'
            : 'CONNECTION_FAILED'
          : 'UNVERIFIED',
        company: latestDiscovery ? latestDiscovery.companyId : 'UNVERIFIED',
        lastDiscovery: latestDiscovery
          ? latestDiscovery.createdAt.toISOString()
          : 'UNVERIFIED',
      },
      masters: {
        missingLedgers,
        missingVendors,
      },
      approvals: {
        pending: pendingApprovals,
        approved: approvedApprovals,
        rejected: rejectedApprovals,
      },
      synchronization: {
        queued: syncQueued,
        failed: syncFailed,
        completed: syncCompleted,
      },
    };
  }

  @Get('enterprise/accounting-health')
  async getAccountingHealth() {
    const latestDiscovery = await this.prisma.tallyDiscoveryReport.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    let healthScore = 0;
    const structureIssues = { total: 0, critical: 0, warning: 0 };

    if (latestDiscovery) {
      const analysis = await this.prisma.structureAnalysisReport.findFirst({
        where: { discoveryId: latestDiscovery.id },
        orderBy: { createdAt: 'desc' },
      });

      if (analysis) {
        healthScore = analysis.score;
        const issues: any[] =
          typeof analysis.issues === 'string'
            ? JSON.parse(analysis.issues)
            : analysis.issues;
        structureIssues.total = issues.length;
        structureIssues.critical = issues.filter(
          (i) => i.severity === 'HIGH',
        ).length;
        structureIssues.warning = issues.filter(
          (i) => i.severity === 'MEDIUM' || i.severity === 'LOW',
        ).length;
      }
    }

    const pendingPlans = await this.prisma.migrationPlan.count({
      where: { status: 'DRAFT' },
    });
    const awaitingApproval = await this.prisma.migrationPlan.count({
      where: { status: 'PENDING_APPROVAL' },
    });

    // Phase 20 Migration Execution metrics
    const totalExecution = await this.prisma.migrationExecution.count();
    const pendingExecution = await this.prisma.migrationExecution.count({
      where: { status: 'PENDING' },
    });
    const runningExecution = await this.prisma.migrationExecution.count({
      where: { status: 'RUNNING' },
    });
    const completedExecution = await this.prisma.migrationExecution.count({
      where: { status: 'COMPLETED' },
    });
    const failedExecution = await this.prisma.migrationExecution.count({
      where: { status: { in: ['FAILED', 'PARTIALLY_FAILED'] } },
    });

    const lastMigration = await this.prisma.migrationExecution.findFirst({
      where: { status: { in: ['COMPLETED', 'FAILED', 'PARTIALLY_FAILED'] } },
      orderBy: { executedAt: 'desc' },
    });

    return {
      connectionStatus: latestDiscovery
        ? latestDiscovery.status === 'COMPLETED'
          ? 'CONNECTED'
          : 'CONNECTION_FAILED'
        : 'UNKNOWN',
      company: latestDiscovery?.companyId || 'NOT_AVAILABLE',
      healthScore,
      structureIssues,
      migration: {
        pendingPlans,
        awaitingApproval,
      },
      migrationExecution: {
        total: totalExecution,
        pending: pendingExecution,
        running: runningExecution,
        completed: completedExecution,
        failed: failedExecution,
      },
      lastDiscovery: {
        timestamp: latestDiscovery?.createdAt.toISOString() || 'NOT_AVAILABLE',
        status: latestDiscovery?.status ?? null,
      },
      lastMigration: lastMigration
        ? lastMigration.executedAt?.toISOString()
        : 'NOT_AVAILABLE',
    };
  }

  @Get('enterprise/migration-health')
  async getMigrationHealth() {
    const runningMigrations = await this.prisma.migrationExecution.count({
      where: { status: 'RUNNING' },
    });
    const completedMigrations = await this.prisma.migrationExecution.count({
      where: { status: 'COMPLETED' },
    });
    const failedMigrations = await this.prisma.migrationExecution.count({
      where: { status: { in: ['FAILED', 'PARTIALLY_FAILED'] } },
    });

    const runningRollbacks = await this.prisma.migrationRollbackExecution.count(
      { where: { status: 'RUNNING' } },
    );
    const failedRollbacks = await this.prisma.migrationRollbackExecution.count({
      where: { status: { in: ['FAILED', 'PARTIAL'] } },
    });

    // Rollback available roughly equals the number of completed migrations that haven't been rolled back
    const totalRollbacks = await this.prisma.migrationRollbackExecution.count();
    const availableRollbacks = Math.max(
      0,
      completedMigrations - totalRollbacks,
    );

    const highRiskMigrationsCount =
      await this.prisma.migrationDependencyGraph.count({
        where: { dependencyType: 'VOUCHER_REFERENCE' },
      });

    const blockedRollbacks = await this.prisma.approvalRequest.count({
      where: { type: 'ROLLBACK_EXECUTION', status: 'REJECTED' }, // We map blocked to rejected here conceptually
    });

    const latestDiscovery = await this.prisma.tallyDiscoveryReport.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return {
      migrations: {
        running: runningMigrations,
        completed: completedMigrations,
        failed: failedMigrations,
      },
      rollback: {
        available: availableRollbacks,
        running: runningRollbacks,
        blocked: blockedRollbacks,
      },
      risks: {
        highRiskMigrations: highRiskMigrationsCount,
        blockedRollbacks,
      },
      tally: {
        connection: latestDiscovery
          ? latestDiscovery.status === 'COMPLETED'
            ? 'CONNECTED'
            : 'CONNECTION_FAILED'
          : 'UNKNOWN',
        lastSync: 'NOT_AVAILABLE', // Will be populated when sync worker writes
        lastDiscovery:
          latestDiscovery?.createdAt.toISOString() || 'NOT_AVAILABLE',
      },
    };
  }

  @Get('enterprise/dashboard')
  async getEnterpriseDashboard() {
    const latestDiscovery = await this.prisma.tallyDiscoveryReport.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const transactionsToday = await this.prisma.document.count({
      where: { receivedAt: { gte: startOfToday } },
    });

    // We consider OCR_PROCESSING or EXTRACTION_PROCESSING as pending validation in Document terminology
    const pendingValidation = await this.prisma.document.count({
      where: { status: { in: ['OCR_PROCESSING', 'EXTRACTION_PROCESSING'] } },
    });

    const manualReviews = await this.prisma.document.count({
      where: { status: 'MANUAL_REVIEW' },
    });

    const runningMigrations = await this.prisma.migrationExecution.count({
      where: { status: 'RUNNING' },
    });
    const completedMigrations = await this.prisma.migrationExecution.count({
      where: { status: 'COMPLETED' },
    });
    const failedMigrations = await this.prisma.migrationExecution.count({
      where: { status: { in: ['FAILED', 'PARTIALLY_FAILED'] } },
    });

    const totalRollbacks = await this.prisma.migrationRollbackExecution.count();
    const availableRollbacks = Math.max(
      0,
      completedMigrations - totalRollbacks,
    );
    const blockedRollbacks = await this.prisma.approvalRequest.count({
      where: { type: 'ROLLBACK_EXECUTION', status: 'REJECTED' },
    });

    const pendingApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'PENDING' },
    });
    const approvedApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'APPROVED' },
    });
    const rejectedApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'REJECTED' },
    });

    return {
      system: {
        status: 'HEALTHY',
        tallyConnection: latestDiscovery
          ? latestDiscovery.status === 'COMPLETED'
            ? 'CONNECTED'
            : 'CONNECTION_FAILED'
          : 'UNKNOWN',
        lastSync: latestDiscovery?.createdAt.toISOString() || 'NOT_AVAILABLE',
      },
      accounting: {
        transactionsToday,
        pendingValidation,
        manualReviews,
      },
      migration: {
        running: runningMigrations,
        completed: completedMigrations,
        failed: failedMigrations,
      },
      rollback: {
        available: availableRollbacks,
        blocked: blockedRollbacks,
      },
      approvals: {
        pending: pendingApprovals,
        approved: approvedApprovals,
        rejected: rejectedApprovals,
      },
    };
  }
}
