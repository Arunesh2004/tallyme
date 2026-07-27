import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuditTimelineService } from './audit-timeline.service';

@Controller('audit/timeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditTimelineController {
  constructor(private readonly auditTimelineService: AuditTimelineService) {}

  @Get(':entityId')
  @Roles('ACCOUNTING_ADMIN', 'AUDITOR', 'VIEW_ONLY')
  async getTimeline(@Param('entityId') entityId: string) {
    return this.auditTimelineService.getTimeline(entityId);
  }
}
