// src/modules/vendor-slip/api/voucher.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../auth/guards/permissions.guard';

@Controller('vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VoucherController {
  @Get()
  @RequirePermissions('Voucher.Read')
  async listVouchers() {
    return { data: [] }; // Stub
  }

  @Get(':id')
  @RequirePermissions('Voucher.Read')
  async getVoucher(@Param('id') id: string) {
    return { id, status: 'GENERATED' }; // Stub
  }

  @Get(':id/entries')
  @RequirePermissions('Voucher.Read')
  async getVoucherEntries(@Param('id') id: string) {
    return { id, entries: [] }; // Stub
  }

  @Post('rebuild/:allocationId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('Voucher.Create')
  async rebuildVoucher(@Param('allocationId') allocationId: string) {
    // 1. Load Allocation
    // 2. Call VoucherBuilder
    // 3. Save Candidate
    // 4. Publish Event
    return { status: 'REBUILT', allocationId };
  }
}
