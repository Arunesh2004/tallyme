// src/infrastructure/erp/api/erp.controller.ts
import { Controller, Get, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../modules/auth/guards/permissions.guard';
import { QueueRegistry } from '../../queue/bullmq';

@Controller('erp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ErpController {
  constructor(private readonly queueRegistry: QueueRegistry) {}
  
  @Get('sync/:voucherId')
  @RequirePermissions('ERP.Read')
  async getSyncStatus(@Param('voucherId') voucherId: string) {
    return { voucherId, status: 'SUCCEEDED' }; // Stub
  }

  @Post('retry/:voucherId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ERP.Sync')
  async retrySync(@Param('voucherId') voucherId: string) {
    const queue = this.queueRegistry.getQueue('erp-sync');
    await queue.add('sync-job', { voucherId, correlationId: crypto.randomUUID() });
    return { voucherId, status: 'REQUEUED' };
  }

  @Get('jobs')
  @RequirePermissions('ERP.Read')
  async getJobs() {
    return { data: [] }; // Stub
  }
}
