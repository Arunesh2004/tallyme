import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/erp-sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ErpSyncPortalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('metrics')
  @Roles('Admin', 'Accountant')
  async getMetrics() {
    const jobs = await this.prisma.eRPSyncJob.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const metrics = {
      pending: 0,
      processing: 0,
      retrying: 0,
      failed: 0,
      success: 0,
    };

    jobs.forEach((job) => {
      if (job.status === 'PENDING') metrics.pending = job._count.status;
      if (job.status === 'SYNCING' || job.status === 'VERIFYING')
        metrics.processing += job._count.status;
      if (job.status === 'RETRY_PENDING') metrics.retrying = job._count.status;
      if (job.status === 'FAILED_PERMANENT' || job.status === 'MANUAL_REVIEW')
        metrics.failed += job._count.status;
      if (job.status === 'SYNCED') metrics.success = job._count.status;
    });

    // Calculate Average Processing Time
    const attempts = await this.prisma.eRPSyncAttempt.aggregate({
      _avg: { durationMs: true },
      where: { durationMs: { not: null } },
    });

    return {
      ...metrics,
      averageProcessingTimeMs: attempts._avg.durationMs || 0,
    };
  }

  @Get('queue')
  @Roles('Admin', 'Accountant', 'Operator')
  async getQueue() {
    return this.prisma.eRPSyncJob.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        voucherCandidate: {
          select: {
            voucherNumber: true,
            voucherType: true,
            company: { select: { name: true } },
          },
        },
      },
    });
  }
}
