import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/authorization/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DocumentReviewService } from '../services/document-review.service';
import { CompanyContextService } from '../../../core/context/company-context.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('document-reviews')
@UseGuards(JwtAuthGuard, RoleGuard)
export class DocumentReviewController {
  constructor(
    private readonly reviewService: DocumentReviewService,
    private readonly companyContext: CompanyContextService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @Roles('OPERATOR', 'ACCOUNTANT', 'ACCOUNTING_ADMIN')
  async listReviews() {
    return this.prisma.documentReviewQueue.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  @Post(':id/assign')
  @Roles('OPERATOR', 'ACCOUNTANT', 'ACCOUNTING_ADMIN')
  async assignReview(@Param('id') id: string, @Body('assignedTo') assignedTo: string, @Req() req: any) {
    const userId = req.user?.sub || 'system';
    let companyId = 'UNKNOWN';
    try { companyId = this.companyContext.getCompanyId(); } catch(e) {}
    return this.reviewService.assignReview(id, assignedTo, userId, companyId);
  }

  @Post(':id/approve')
  @Roles('OPERATOR', 'ACCOUNTANT', 'ACCOUNTING_ADMIN')
  async approveReview(@Param('id') id: string, @Body('notes') notes: string, @Req() req: any) {
    const userId = req.user?.sub || 'system';
    let companyId = 'UNKNOWN';
    try { companyId = this.companyContext.getCompanyId(); } catch(e) {}
    return this.reviewService.approveReview(id, userId, companyId, notes);
  }

  @Post(':id/reject')
  @Roles('OPERATOR', 'ACCOUNTANT', 'ACCOUNTING_ADMIN')
  async rejectReview(@Param('id') id: string, @Body('notes') notes: string, @Req() req: any) {
    const userId = req.user?.sub || 'system';
    let companyId = 'UNKNOWN';
    try { companyId = this.companyContext.getCompanyId(); } catch(e) {}
    return this.reviewService.rejectReview(id, userId, companyId, notes);
  }
}
