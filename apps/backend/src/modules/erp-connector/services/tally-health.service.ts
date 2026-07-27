import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class TallyHealthService {
  private readonly logger = new Logger(TallyHealthService.name);

  constructor(
    private readonly prisma: PrismaService
  ) {}

  async getHealthStatus(companyId?: string) {
    // 1. Connection Latency & status from Agent Heartbeat
    let latencyMs = -1;
    let isConnected = false;
    let authFailure = false;
    let activeCompany = 'Unknown';

    try {
      const lastHeartbeat = await this.prisma.agentHeartbeat.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (lastHeartbeat) {
        isConnected = lastHeartbeat.status === 'ONLINE' && lastHeartbeat.tallyStatus === 'CONNECTED';
        latencyMs = lastHeartbeat.latencyMs || -1;
        if (lastHeartbeat.tallyCompany) {
          activeCompany = lastHeartbeat.tallyCompany;
        }
      }
    } catch (e: any) {
      this.logger.error('Failed to fetch heartbeat', e.stack);
    }

    // 2. Last successful sync
    const lastSync = await this.prisma.eRPSyncJob.findFirst({
      where: { status: 'SYNCED' },
      orderBy: { lastAttemptAt: 'desc' },
    });

    // 3. Last discovery
    const lastDiscovery = await this.prisma.tallyDiscoveryReport.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Failures
    const xmlFailures = await this.prisma.eRPSyncJob.count({
      where: { status: { in: ['FAILED_PERMANENT', 'FAILED_TEMPORARY'] } },
    });

    return {
      connection: {
        status: isConnected ? 'CONNECTED' : 'CONNECTION_FAILED',
        latencyMs: latencyMs >= 0 ? latencyMs : null,
      },
      company: activeCompany,
      lastSuccessfulSync: lastSync ? lastSync.lastAttemptAt : null,
      lastDiscovery: lastDiscovery ? lastDiscovery.createdAt : null,
      failures: {
        xmlErrors: xmlFailures,
        authenticationFailures: authFailure ? 1 : 0,
      },
      masterHealth: {
        ledgers: await this.prisma.tallyMasterMapping.count(),
        missing: await this.prisma.tallyMasterMapping.count({
          where: { status: 'BROKEN' },
        }),
      },
      syncHealth: {
        successful: await this.prisma.eRPSyncJob.count({
          where: { status: 'SYNCED' },
        }),
        failed: await this.prisma.eRPSyncJob.count({
          where: { status: 'FAILED_PERMANENT' },
        }),
        pending: await this.prisma.eRPSyncJob.count({
          where: { status: 'PENDING' },
        }),
      },
      reconciliation: {
        matched: await this.prisma.accountingReconciliation.count({
          where: { status: 'MATCHED' },
        }),
        mismatched: await this.prisma.accountingReconciliation.count({
          where: { status: 'MISMATCHED' },
        }),
      },
    };
  }
}
