import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ProcessMatchingUseCase } from '../use-cases/process-matching.use-case';
import { ProcessMatchingDto } from '../dto/matching.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../auth/authorization/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';

@Controller('student-matching')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MatchingController {
  constructor(private readonly useCase: ProcessMatchingUseCase) {}

  @Post('process')
  @Permissions('admin:matching:process')
  async process(@Body() dto: ProcessMatchingDto) {
    await this.useCase.execute(dto.paymentCandidateId);
    return { success: true, message: 'Matching process initiated' };
  }
}
