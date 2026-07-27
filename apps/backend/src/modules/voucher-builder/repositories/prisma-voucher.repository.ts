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
      // Idempotency check: If batchSyncItemId exists and already has a voucher, return it
      if (candidateData.batchSyncItemId) {
        const batchItem = await tx.batchSyncItem.findUnique({
          where: { id: candidateData.batchSyncItemId },
        });
        if (batchItem && batchItem.voucherCandidateId) {
          const existingCandidate = await tx.voucherCandidate.findUnique({
            where: { id: batchItem.voucherCandidateId },
          });
          if (existingCandidate) {
            return existingCandidate;
          }
        }
      }

      const candidate = await tx.voucherCandidate.create({
        data: {
          companyId: candidateData.companyId,
          voucherNumber: candidateData.voucherNumber,
          voucherType:
            candidateData.voucherType === 'PURCHASE' ? 'Purchase' : 'Receipt',
          date:
            candidateData.date instanceof Date
              ? candidateData.date
              : new Date(candidateData.date || Date.now()),
          status: 'PENDING',
          entries: {
            create:
              candidateData.lines?.map((l: any, i: number) => ({
                sequence: i,
                ledgerName: l.ledgerName || l.voucherLedgerId || 'DEV_MODE',
                amount: l.amount || 0,
                isDebit: l.type === 'DEBIT',
              })) || [],
          },
        },
      });

      if (logData) {
        logData.voucherValidationId = candidate.id;
        const validation = await tx.voucherValidation.create({
          data: {
            voucherCandidateId: candidate.id,
            status: candidateData.validationStatus,
            executionTimeMs: logData.details?.executionTimeMs || 0,
          },
        });
        await tx.voucherValidationLog.create({
          data: {
            voucherValidationId: validation.id,
            details: {
              level: logData.level,
              message: logData.message,
              ...(logData.details || {}),
            },
          },
        });
      }

      if (candidateData.batchSyncItemId) {
        await tx.batchSyncItem.update({
          where: { id: candidateData.batchSyncItemId },
          data: { voucherCandidateId: candidate.id, status: 'VOUCHER_CREATED' },
        });
      }

      return candidate;
    });
  }

  async findLedgerByName(name: string): Promise<any> {
    return this.prisma.voucherLedger.findUnique({
      where: { name },
    });
  }

  async findFeeAllocationCandidateById(id: string): Promise<any> {
    return this.prisma.feeAllocationCandidate.findUnique({
      where: { id },
      include: {
        studentPaymentCandidate: true,
      },
    });
  }

  async checkCompanyExists(id: string): Promise<boolean> {
    const count = await this.prisma.company.count({ where: { id } });
    return count > 0;
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
