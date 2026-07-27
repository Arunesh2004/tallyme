import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('api/student-transactions')
export class StudentTransactionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('recent')
  async getRecentStudentTransactions() {
    try {
      // 1. Fetch from canonical VoucherCandidate table, NO duplicate accounting tables
      const vouchers = await this.prisma.voucherCandidate.findMany({
        where: {
          voucherType: 'Receipt',
        },
        orderBy: {
          date: 'desc',
        },
        take: 30,
        include: {
          erpSyncJob: true,
          entries: true,
          feeAllocationCandidate: {
            include: {
              studentPaymentCandidate: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
      });

      return vouchers.map((voucher) => {
        // Calculate Total Payment Amount based on Debit entries
        const amount = voucher.entries
          .filter((e) => e.isDebit)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const student =
          voucher.feeAllocationCandidate?.studentPaymentCandidate?.student;

        return {
          // Fields available in schema
          voucherId: voucher.id,
          amount: amount,
          erpSyncStatus: voucher.erpSyncJob
            ? voucher.erpSyncJob.status
            : 'PENDING',
          timestamp: voucher.date,

          // Real Student Data
          studentName: student
            ? `${student.firstName} ${student.lastName}`.trim()
            : 'UNVERIFIED FIELD',
          admissionNumber: student?.admissionNumber || 'UNVERIFIED FIELD',
          class: student?.class || 'UNVERIFIED FIELD',
          section: student?.section || 'UNVERIFIED FIELD',
          academicYear: student?.academicYear || 'UNVERIFIED FIELD',
          month: 'UNVERIFIED FIELD', // Not part of student master, usually part of fee head
        };
      });
    } catch (error: any) {
      throw new HttpException(
        'Failed to fetch recent transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
