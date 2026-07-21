// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma';
import { QueueHealth } from '../../infrastructure/queue/bullmq';
import { ERPConnector } from '../../infrastructure/erp/contracts';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueHealth: QueueHealth,
    private readonly erpConnector: ERPConnector,
  ) {}

  @Get('live')
  livenessCheck() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readinessCheck() {
    let dbStatus = 'UP';
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'DOWN';
    }

    if (dbStatus === 'DOWN') {
      return { status: 'DOWN', dependencies: { database: dbStatus } };
    }
    return { status: 'UP', dependencies: { database: dbStatus } };
  }

  @Get()
  async fullHealthCheck() {
    const db = await this.checkDatabase();
    const queue = await this.checkQueue();
    // Assuming erpConnector might be missing or optional in some deployments, but let's check it if present.
    const erp = await this.checkERP();

    return {
      status: db.status === 'UP' && queue.status === 'UP' ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      components: {
        database: db,
        queue: queue,
        erp: erp,
      },
    };
  }

  @Get('database')
  async checkDatabase() {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return { status: 'UP' };
    } catch (e) {
      return { status: 'DOWN', error: 'Database unreachable' };
    }
  }

  @Get('queue')
  async checkQueue() {
    return await this.queueHealth.checkHealth();
  }

  @Get('erp')
  async checkERP() {
    return await this.erpConnector.pingERP();
  }
}
