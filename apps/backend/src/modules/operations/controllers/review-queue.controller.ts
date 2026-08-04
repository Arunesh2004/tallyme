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
        include: {
          document: true,
          matchDecision: {
            include: {
              selectedVendorLedger: {
                include: {
                  vendorBranch: {
                    include: { vendor: true },
                  },
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.invoiceCandidate.count({
        where: { status: 'MANUAL_REVIEW_REQUIRED' },
      }),
    ]);

    const mappedItems = await Promise.all(
      items.map(async (item) => {
        let suggestedVendor = null;
        if (item.matchDecision?.selectedVendorLedger?.vendorBranch) {
          const branch = item.matchDecision.selectedVendorLedger.vendorBranch;
          suggestedVendor = {
            id: branch.id, // This is the vendorBranchId the frontend needs
            name: branch.vendor.name,
            gstin: branch.gstin,
          };
        } else if (item.extractedGstin) {
          // Fallback: If no matchDecision exists but we have a GSTIN, try to find the branch
          const branch = await this.prisma.vendorBranch.findFirst({
            where: { gstin: item.extractedGstin },
            include: { vendor: true },
          });
          if (branch) {
            suggestedVendor = {
              id: branch.id,
              name: branch.vendor.name,
              gstin: branch.gstin,
            };
          }
        }
        return {
          ...item,
          suggestedVendor,
        };
      }),
    );

    return {
      data: mappedItems,
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
