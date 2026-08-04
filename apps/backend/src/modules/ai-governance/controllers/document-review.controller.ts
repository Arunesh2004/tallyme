import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { DocumentReviewService } from '../services/document-review.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/authorization/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('document-reviews')
@UseGuards(JwtAuthGuard, RoleGuard)
export class DocumentReviewController {
  constructor(private readonly reviewService: DocumentReviewService) {}

  @Get('pending')
  @Roles('OPERATOR', 'ACCOUNTANT', 'ACCOUNTING_ADMIN')
  async getPending(@Req() req: any) {
    const tenantId = req.user?.organizationId || req.user?.companyId;
    return this.reviewService.getPendingQueue(tenantId);
  }

  @Post(':id/assign')
  @Roles('OPERATOR', 'ACCOUNTANT', 'ACCOUNTING_ADMIN')
  async assign(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub;
    return this.reviewService.assignReview(id, userId);
  }

  @Post(':id/approve')
  @Roles('OPERATOR', 'ACCOUNTANT', 'ACCOUNTING_ADMIN')
  async approve(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const userId = req.user?.sub;
    return this.reviewService.approveReview(id, userId, data);
  }

  @Post(':id/reject')
  @Roles('OPERATOR', 'ACCOUNTANT', 'ACCOUNTING_ADMIN')
  async reject(@Param('id') id: string, @Req() req: any, @Body('reason') reason: string) {
    const userId = req.user?.sub;
    return this.reviewService.rejectReview(id, userId, reason);
  }
}
