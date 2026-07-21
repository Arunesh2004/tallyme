import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Assuming prisma service is available globally or imported
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @Roles('Admin', 'Accountant')
  async getSummary() {
    // 1. Vouchers Generated Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayVouchers = await this.prisma.voucherCandidate.count({
      where: {
        date: { gte: today },
      },
    });

    // 2. Vendor Documents Processed
    const vendorDocs = await this.prisma.document.count();

    // 3. Student Payments Processed
    const studentPayments = await this.prisma.emailDocument.count();

    // 4. Pending Manual Reviews
    const vendorReviews = await this.prisma.manualReviewRoute.count({
      where: { status: 'PENDING' },
    });
    const studentReviews = await this.prisma.studentManualReviewRoute.count({
      where: { status: 'PENDING' },
    });

    // 5. System Health
    const health = { status: 'Operational', lastCheck: new Date() };

    return {
      todayVouchers,
      vendorDocsProcessed: vendorDocs,
      studentPaymentsProcessed: studentPayments,
      pendingManualReviews: vendorReviews + studentReviews,
      health,
    };
  }

  @Get('activity')
  @Roles('Admin', 'Accountant', 'Operator')
  async getActivity() {
    // Combine recent vendor slip audits and student payment audits
    const vendorAudits = await this.prisma.vendorSlipAudit.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { document: { select: { source: true, status: true } } },
    });

    const studentAudits = await this.prisma.studentPaymentAudit.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        document: { select: { source: true, status: true, subject: true } },
      },
    });

    const combined = [
      ...vendorAudits.map((a) => ({ ...a, type: 'VENDOR' })),
      ...studentAudits.map((a) => ({ ...a, type: 'STUDENT' })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    return combined;
  }
}
