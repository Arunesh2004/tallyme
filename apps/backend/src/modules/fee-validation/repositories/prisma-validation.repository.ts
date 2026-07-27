import { Injectable } from '@nestjs/common';
import { IFeeValidationRepository } from '../interfaces/validation.interfaces';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaFeeValidationRepository implements IFeeValidationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveCandidate(data: any): Promise<any> {
    return this.prisma.feeAllocationCandidate.create({
      data,
    });
  }

  async findCandidateById(id: string): Promise<any> {
    return this.prisma.feeAllocationCandidate.findUnique({
      where: { id },
    });
  }

  async findStudentPaymentCandidateById(id: string): Promise<any> {
    return this.prisma.studentPaymentCandidate.findUnique({
      where: { id },
    });
  }

  async getStudentOutstandings(studentId: string): Promise<any[]> {
    return this.prisma.outstandingFee.findMany({
      where: { studentId },
    });
  }

  async logValidation(log: any): Promise<void> {
    await this.prisma.feeValidationLog.create({
      data: log,
    });
  }

  async saveException(exception: any): Promise<void> {
    await this.prisma.feeValidationException.create({
      data: exception,
    });
  }

  // New method for transactional save
  async saveValidationResult(
    candidateData: any,
    logData: any,
    exceptionsData: any[],
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.feeAllocationCandidate.create({
        data: {
          studentPaymentCandidateId: candidateData.studentPaymentCandidateId,
          validationStatus: candidateData.validationStatus,
        },
      });

      if (logData) {
        logData.feeValidationId = candidate.id;
        // In schema, FeeValidationLog relates to FeeValidation (not Candidate),
        // (implementation note)
        const validation = await tx.feeValidation.create({
          data: {
            feeAllocationCandidateId: candidate.id,
            status: candidateData.validationStatus,
            executionTimeMs: logData.details?.executionTimeMs || 0,
          },
        });
        await tx.feeValidationLog.create({
          data: {
            feeValidationId: validation.id,
            details: {
              level: logData.level,
              message: logData.message,
              ...(logData.details || {}),
            },
          },
        });
      }

      if (exceptionsData && exceptionsData.length > 0) {
        exceptionsData.forEach(
          (e) => (e.feeAllocationCandidateId = candidate.id),
        );
        await tx.feeValidationException.createMany({ data: exceptionsData });
      }

      // Update OutstandingFee balances based on successful allocations
      if (
        candidateData.validationStatus !== 'INVALID' &&
        candidateData.validationStatus !== 'DUPLICATE_PAYMENT'
      ) {
        for (const alloc of candidateData.allocationBreakdown) {
          if (alloc.outstandingFeeId) {
            await tx.outstandingFee.update({
              where: { id: alloc.outstandingFeeId },
              data: {
                amountPaid: alloc.newAmountPaid,
                isPaid: alloc.isPaid,
              },
            });
          }
        }
      }

      return candidate;
    });
  }
}
