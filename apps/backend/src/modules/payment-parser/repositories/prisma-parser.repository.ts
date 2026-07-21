import { Injectable } from '@nestjs/common';
import { IPaymentParserRepository } from '../interfaces/parser.interfaces';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaParserRepository implements IPaymentParserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveCandidate(candidate: any): Promise<any> {
    return this.prisma.paymentCandidate.create({
      data: {
        ...candidate,
        rawData: candidate.rawData || {},
      },
    });
  }

  async logAttempt(attempt: any): Promise<void> {
    await this.prisma.parsingAttempt.create({
      data: attempt,
    });
  }

  // New method for transactional save
  async saveParsingResult(candidateData: any, attemptData: any): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.paymentCandidate.create({
        data: candidateData,
      });

      if (attemptData) {
        attemptData.paymentCandidateId = candidate.id;
        await tx.parsingAttempt.create({ data: attemptData });
      }

      return candidate;
    });
  }

  async findSimilarCandidates(criteria: any): Promise<any[]> {
    const where: any = { gateway: criteria.gateway };

    // Exact match checks based on available distinct fields
    if (criteria.transactionId) where.transactionId = criteria.transactionId;
    else if (criteria.utr) where.utr = criteria.utr;
    else if (criteria.referenceNumber)
      where.referenceNumber = criteria.referenceNumber;
    else return [];

    return this.prisma.paymentCandidate.findMany({ where });
  }
}
