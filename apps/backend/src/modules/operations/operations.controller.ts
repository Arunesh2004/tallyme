import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApprovalBatchService } from './approval-batch/approval-batch.service';

@Controller('operations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationsController {
  constructor(private readonly approvalBatchService: ApprovalBatchService) {}

  @Get('vendor-queue')
  @Roles('ACCOUNTING_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTING_REVIEWER')
  async getVendorQueue() {
    // Stub returning pending vendor queue items
    return [];
  }

  @Post('vendor-queue/:id/approve')
  @Roles('ACCOUNTING_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTING_REVIEWER')
  async approveVendorItem(@Param('id') id: string) {
    return { status: 'APPROVED', id };
  }

  @Post('vendor-queue/bulk-approve')
  @Roles('ACCOUNTING_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTING_REVIEWER')
  async bulkApproveVendorQueue(@Body('ids') ids: string[]) {
    return { status: 'BULK_APPROVED', count: ids.length };
  }

  @Get('student-payments')
  @Roles('ACCOUNTING_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTING_REVIEWER')
  async getStudentPayments() {
    return [];
  }

  @Get('batches')
  @Roles('ACCOUNTING_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTING_REVIEWER')
  async getBatches() {
    return [];
  }
}
