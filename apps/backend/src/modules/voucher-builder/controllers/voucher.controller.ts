import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ProcessVoucherBuilderUseCase } from '../use-cases/process-voucher-builder.use-case';
import { ProcessVoucherDto } from '../dto/voucher.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../auth/authorization/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';

@Controller('voucher-builder')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VoucherController {
  constructor(private readonly useCase: ProcessVoucherBuilderUseCase) {}

  @Post('process')
  @Permissions('admin:voucher-builder:process')
  async process(@Body() dto: ProcessVoucherDto, @Req() req: any) {
    const companyId = req.user?.tenantId; // Assume tenantId maps to companyId in this context
    await this.useCase.execute({
      feeAllocationCandidateId: dto.feeAllocationCandidateId,
      companyId,
    });
    return { success: true, message: 'Voucher building process initiated' };
  }
}
