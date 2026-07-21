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
    private readonly erpConnector: ERPConnector
  ) {}

  @Get()
  check() {
    return { status: 'UP', timestamp: new Date().toISOString() };
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
