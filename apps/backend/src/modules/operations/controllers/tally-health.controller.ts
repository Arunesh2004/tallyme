import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TallyHealthService } from '../../erp-connector/services/tally-health.service';

@Controller('tally/health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TallyHealthController {
  constructor(private readonly tallyHealthService: TallyHealthService) {}

  @Get()
  @Roles(
    'ACCOUNTING_ADMIN',
    'TALLY_ADMIN',
    'TALLY_OPERATOR',
    'TALLY_AUDITOR',
    'OPERATOR',
    'VIEW_ONLY',
  )
  async getHealth() {
    return this.tallyHealthService.getHealthStatus();
  }
}
