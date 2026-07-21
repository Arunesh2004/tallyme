import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ProcessERPSyncUseCase } from '../use-cases/process-erp-sync.use-case';
import { ERPHealthService } from '../services/health.service';
import { ProcessERPSyncDto } from '../dto/erp.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../auth/authorization/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';
import { ERP_ADAPTERS } from '../constants/erp.constants';

@Controller('erp-connector')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ERPController {
  constructor(
    private readonly useCase: ProcessERPSyncUseCase,
    private readonly healthService: ERPHealthService,
  ) {}

  @Post('sync')
  @Permissions('admin:erp-connector:sync')
  async process(@Body() dto: ProcessERPSyncDto) {
    await this.useCase.execute(dto.voucherCandidateId);
    return { success: true, message: 'ERP sync process initiated' };
  }

  @Get('health')
  @Permissions('admin:erp-connector:health')
  async checkHealth() {
    const isHealthy = await this.healthService.checkHealth(
      ERP_ADAPTERS.TALLY_PRIME_V1,
    );
    return { success: true, adapter: ERP_ADAPTERS.TALLY_PRIME_V1, isHealthy };
  }
}
