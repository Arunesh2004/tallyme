import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('review')
export class ReviewQueueController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('vendor')
  async getVendorQueue(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [items, total] = await Promise.all([
      this.prisma.invoiceCandidate.findMany({
        where: { status: 'MANUAL_REVIEW_REQUIRED' },
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.invoiceCandidate.count({
        where: { status: 'MANUAL_REVIEW_REQUIRED' },
      }),
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
    };
  }

  @Get('student')
  async getStudentQueue(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [items, total] = await Promise.all([
      this.prisma.studentPaymentCandidate.findMany({
        where: {
          OR: [{ status: 'MANUAL_REVIEW' }, { manualReviewRequired: true }],
        },
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.studentPaymentCandidate.count({
        where: {
          OR: [{ status: 'MANUAL_REVIEW' }, { manualReviewRequired: true }],
        },
      }),
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
    };
  }
}
