import { Controller, Get, Query } from '@nestjs/common';
import { AuditAggregatorService } from '../services/audit-aggregator.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditAggregator: AuditAggregatorService) {}

  @Get('events')
  async getEvents(@Query('limit') limit: string = '50') {
    return this.auditAggregator.getAggregatedEvents(parseInt(limit, 10));
  }
}
