import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ProcessValidationUseCase } from '../use-cases/process-validation.use-case';
import { ProcessValidationDto } from '../dto/validation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../auth/authorization/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';

@Controller('fee-validation')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ValidationController {
  constructor(private readonly useCase: ProcessValidationUseCase) {}

  @Post('process')
  @Permissions('admin:fee-validation:process')
  async process(@Body() dto: ProcessValidationDto) {
    await this.useCase.execute(dto.studentPaymentCandidateId);
    return { success: true, message: 'Fee validation process initiated' };
  }
}
