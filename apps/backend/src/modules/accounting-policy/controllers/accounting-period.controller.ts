import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AccountingPeriodService } from '../services/accounting-period.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/authorization/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('accounting-periods')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AccountingPeriodController {
  constructor(private readonly accountingPeriodService: AccountingPeriodService) {}

  @Post('/')
  @Roles('ACCOUNTING_ADMIN', 'ORGANIZATION_ADMIN')
  async createPeriod(@Req() req: any, @Body() body: { companyId: string, name: string, startDate: string, endDate: string }) {
    const userId = req.user?.sub || 'system';
    return this.accountingPeriodService.createPeriod(
      body.companyId,
      body.name,
      new Date(body.startDate),
      new Date(body.endDate),
      userId
    );
  }

  @Post(':id/lock')
  @Roles('ACCOUNTING_ADMIN', 'ORGANIZATION_ADMIN')
  async lockPeriod(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) {
    const userId = req.user?.sub || 'system';
    return this.accountingPeriodService.lockPeriod(id, userId, reason);
  }

  @Post(':id/unlock')
  @Roles('ACCOUNTING_ADMIN', 'ORGANIZATION_ADMIN')
  async unlockPeriod(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) {
    const userId = req.user?.sub || 'system';
    return this.accountingPeriodService.unlockPeriod(id, userId, reason);
  }

  @Post(':id/close')
  @Roles('ACCOUNTING_ADMIN', 'ORGANIZATION_ADMIN')
  async closePeriod(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) {
    const userId = req.user?.sub || 'system';
    return this.accountingPeriodService.closePeriod(id, userId, reason);
  }

  @Post(':id/override')
  @Roles('SUPER_ADMIN')
  async overrideLock(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) {
    const userId = req.user?.sub || 'system';
    await this.accountingPeriodService.overrideLockedPeriod(id, userId, reason);
    return { success: true, message: 'Period lock overridden temporarily.' };
  }
}
