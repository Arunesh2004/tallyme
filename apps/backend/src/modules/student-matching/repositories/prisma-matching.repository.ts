import { Injectable } from '@nestjs/common';
import { IMatchingRepository } from '../interfaces/matching.interfaces';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaMatchingRepository implements IMatchingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveCandidate(data: any): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.studentPaymentCandidate.create({
        data: {
          paymentCandidateId: data.paymentCandidateId,
          studentId: data.studentId,
          admissionNumber: data.admissionNumber,
          matchedBy: data.matchedBy,
          confidence: data.confidence,
          matchingStrategy: data.matchingStrategy,
          matchingScore: data.matchingScore,
          warnings: data.warnings || [],
          manualReviewRequired: data.manualReviewRequired || false,
          rawMatchingData: data.rawMatchingData || {},
          status: data.status,
        },
      });
      return candidate;
    });
  }

  async findCandidateByPaymentId(paymentCandidateId: string): Promise<any> {
    return this.prisma.studentPaymentCandidate.findUnique({
      where: { paymentCandidateId },
    });
  }

  async logAttempt(attempt: any): Promise<void> {
    await this.prisma.matchingAttempt.create({
      data: attempt,
    });
  }

  async saveConflict(conflict: any): Promise<void> {
    await this.prisma.matchingConflict.create({
      data: conflict,
    });
  }

  async saveMatch(match: any): Promise<void> {
    await this.prisma.studentMatch.create({
      data: match,
    });
  }

  // New method for transactional save
  async saveMatchingResult(
    candidateData: any,
    attemptData: any,
    matchesData: any[],
    conflictsData: any[],
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.studentPaymentCandidate.create({
        data: candidateData,
      });

      if (attemptData) {
        attemptData.studentPaymentCandidateId = candidate.id;
        await tx.matchingAttempt.create({ data: attemptData });
      }

      if (matchesData && matchesData.length > 0) {
        matchesData.forEach(
          (m) => (m.studentPaymentCandidateId = candidate.id),
        );
        await tx.studentMatch.createMany({ data: matchesData });
      }

      if (conflictsData && conflictsData.length > 0) {
        conflictsData.forEach(
          (c) => (c.studentPaymentCandidateId = candidate.id),
        );
        await tx.matchingConflict.createMany({ data: conflictsData });
      }
      return candidate;
    });
  }
}
