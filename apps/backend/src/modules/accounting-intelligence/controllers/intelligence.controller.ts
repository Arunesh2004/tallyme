import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LearningFeedbackService } from '../learning-feedback/learning-feedback.service';

@Controller('intelligence')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntelligenceController {
  constructor(
    private readonly learningFeedbackService: LearningFeedbackService,
  ) {}

  @Get('accuracy')
  @Roles('ACCOUNTING_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTING_REVIEWER')
  async getAccuracy() {
    // Stub implementation returning metrics
    return {
      extractionAccuracy: 0.96,
      vendorMatching: 0.94,
      invoiceNumberAccuracy: 0.98,
    };
  }

  @Get('exceptions')
  @Roles('ACCOUNTING_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTING_REVIEWER')
  async getExceptions() {
    // Stub implementation fetching AccountingExceptions
    return [];
  }

  @Post('correction')
  @Roles('ACCOUNTING_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTING_REVIEWER')
  async submitCorrection(@Body() body: any, @Body('userId') userId: string) {
    const { documentId, fieldName, oldValue, newValue } = body;
    return this.learningFeedbackService.recordCorrection(
      documentId,
      fieldName,
      oldValue,
      newValue,
      userId || 'system',
    );
  }
}
