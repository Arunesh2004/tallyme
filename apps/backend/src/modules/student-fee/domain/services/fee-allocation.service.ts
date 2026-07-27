import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeeAllocationService {
  constructor(private readonly prisma: PrismaService) {}

  async allocate(paymentCandidateId: string): Promise<any> {
    const candidate = await this.prisma.studentPaymentCandidate.findUnique({
      where: { id: paymentCandidateId },
    });

    if (!candidate || !candidate.amount || !candidate.studentId) {
      throw new Error('Invalid Payment Candidate for Allocation');
    }

    // Duplicate Allocation Protection
    const existingAllocation =
      await this.prisma.feeAllocationCandidate.findFirst({
        where: { studentPaymentCandidateId: paymentCandidateId },
      });
    if (existingAllocation) {
      throw new Error('Duplicate Allocation Detected');
    }

    // Fetch Outstanding Fees
    const outstandingFees = await this.prisma.outstandingFee.findMany({
      where: { studentId: candidate.studentId, isPaid: false },
    });

    let remainingAmount = Number(candidate.amount);
    const allocatedLines: Array<{ feeHeadName: string; amount: number }> = [];

    // Allocation Logic
    for (const fee of outstandingFees) {
      if (remainingAmount <= 0) break;

      const due = 1500; // (implementation note)
      const allocating = Math.min(remainingAmount, due);

      allocatedLines.push({
        feeHeadName: 'Fee Collection',
        amount: allocating,
      });

      remainingAmount -= allocating;

      await this.prisma.outstandingFee.update({
        where: { id: fee.id },
        data: {
          amountPaid: { increment: allocating },
          isPaid: allocating >= due,
        },
      });
    }

    // Advance Payment handling
    if (remainingAmount > 0) {
      allocatedLines.push({
        feeHeadName: 'Student Advance',
        amount: remainingAmount,
      });
    }

    // Persist Candidate to converge with Accounting
    const allocationCandidate = await this.prisma.feeAllocationCandidate.create(
      {
        data: {
          studentPaymentCandidateId: paymentCandidateId,
          validationStatus: 'VALIDATED',
        },
      },
    );

    return {
      allocationCandidateId: allocationCandidate.id,
      breakdown: allocatedLines,
    };
  }
}
