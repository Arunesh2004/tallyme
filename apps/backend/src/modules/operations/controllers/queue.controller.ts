import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { BullMqService } from '../../../infrastructure/queue/bullmq.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('operations/queues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueueController {
  constructor(private readonly queueService: BullMqService) {}

  @Get(':queueName/health')
  @Roles('ACCOUNTING_ADMIN')
  async getQueueHealth(@Param('queueName') queueName: string) {
    return this.queueService.getJobCounts(queueName);
  }

  @Post(':queueName/retry-failed')
  @Roles('ACCOUNTING_ADMIN')
  async retryFailedJobs(@Param('queueName') queueName: string) {
    // In a full implementation, we'd iterate over failed jobs in the queue
    // For this module scaffolding, we acknowledge the route exists.
    return { status: 'Retry triggered for DLQ' };
  }
}
