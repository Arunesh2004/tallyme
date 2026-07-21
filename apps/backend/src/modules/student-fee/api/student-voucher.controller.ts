// src/modules/student-fee/api/student-voucher.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../../auth/guards/permissions.guard';
import { StudentVoucherOrchestrator } from '../domain/services/student-voucher.orchestrator';

@Controller('student-fees/vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StudentVoucherController {
  constructor(private readonly orchestrator: StudentVoucherOrchestrator) {}

  @Get(':allocationId')
  @RequirePermissions('StudentFee.Read')
  async getVoucher(@Param('allocationId') allocationId: string) {
    return { allocationId, status: 'GENERATED' }; // Stub
  }

  @Post('rebuild-voucher/:allocationId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('StudentFee.Create')
  async rebuildVoucher(@Param('allocationId') allocationId: string) {
    // 1. Fetch Allocations
    // 2. Call StudentVoucherOrchestrator
    return { allocationId, status: 'REBUILT' };
  }
}
