import { Injectable } from '@nestjs/common';
import { IVoucherRepository } from '../interfaces/voucher.interfaces';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaVoucherRepository implements IVoucherRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveVoucherCandidate(data: any): Promise<any> {
    return this.prisma.voucherCandidate.create({
      data: {
        ...data,
        lines: { create: data.lines },
        references: { create: data.references },
        narrations: { create: data.narrations },
      },
    });
  }

  // New method for transactional save
  async saveVoucherResult(candidateData: any, logData: any): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.voucherCandidate.create({
        data: {
          ...candidateData,
          lines: { create: candidateData.lines },
          references: { create: candidateData.references },
          narrations: { create: candidateData.narrations },
        }
      });

      if (logData) {
        logData.voucherValidationId = candidate.id;
        const validation = await tx.voucherValidation.create({
          data: {
            voucherCandidateId: candidate.id,
            status: candidateData.validationStatus,
            executionTimeMs: logData.details?.executionTimeMs || 0
          }
        });
        logData.voucherValidationId = validation.id;
        await tx.voucherValidationLog.create({ data: logData });
      }

      return candidate;
    });
  }

  async findLedgerByName(name: string): Promise<any> {
    return this.prisma.voucherLedger.findUnique({
      where: { name },
    });
  }

  async logValidation(log: any): Promise<void> {
    await this.prisma.voucherValidationLog.create({
      data: log,
    });
  }

  async logAttempt(attempt: any): Promise<void> {
    await this.prisma.voucherGenerationAttempt.create({
      data: attempt,
    });
  }
}
