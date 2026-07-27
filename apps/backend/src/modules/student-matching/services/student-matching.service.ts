import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface MatchingResult {
  studentId: string | null;
  confidence: number;
  strategy: string;
  requiresManualReview: boolean;
}

@Injectable()
export class StudentMatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async match(paymentCandidateId: string): Promise<MatchingResult> {
    const candidate = await this.prisma.studentPaymentCandidate.findUnique({
      where: { id: paymentCandidateId },
    });

    if (!candidate) {
      throw new Error('Payment Candidate not found');
    }

    let result: MatchingResult = {
      studentId: null,
      confidence: 0,
      strategy: 'NONE',
      requiresManualReview: true,
    };

    // Priority 1: Admission Number (Extremely high confidence)
    if (candidate.admissionNumber) {
      const student = await this.prisma.student.findUnique({
        where: { admissionNumber: candidate.admissionNumber },
      });
      if (student) {
        result = {
          studentId: student.id,
          confidence: 1.0,
          strategy: 'ADMISSION_NUMBER',
          requiresManualReview: false,
        };
        return this.saveAndReturn(candidate.id, result);
      }
    }

    // Priority 2: Email (High confidence)
    if (candidate.payerEmail) {
      const student = await this.prisma.student.findUnique({
        where: { email: candidate.payerEmail },
      });
      if (student) {
        result = {
          studentId: student.id,
          confidence: 0.9,
          strategy: 'EMAIL',
          requiresManualReview: false,
        };
        return this.saveAndReturn(candidate.id, result);
      }
    }

    // Priority 3: Phone (High confidence)
    if (candidate.payerPhone) {
      const students = await this.prisma.student.findMany({
        where: { phone: candidate.payerPhone },
      });
      if (students.length === 1) {
        result = {
          studentId: students[0].id,
          confidence: 0.85,
          strategy: 'PHONE',
          requiresManualReview: false,
        };
        return this.saveAndReturn(candidate.id, result);
      }
    }

    // Priority 4: Name Similarity (Lower confidence)
    if (candidate.rawStudentName) {
      // In a real system, implement Levenshtein distance or Trigram matching here.
      // For this runtime proof, we do a simple ILIKE or prefix match.
      const students = await this.prisma.student.findMany({
        where: {
          firstName: {
            startsWith: candidate.rawStudentName.split(' ')[0],
            mode: 'insensitive',
          },
        },
      });

      if (students.length === 1) {
        // Name matching is inherently risky; we cap confidence at 0.75
        result = {
          studentId: students[0].id,
          confidence: 0.75,
          strategy: 'NAME_SIMILARITY',
          requiresManualReview: true,
        };
        return this.saveAndReturn(candidate.id, result);
      }
    }

    // Unmatched
    return this.saveAndReturn(candidate.id, result);
  }

  private async saveAndReturn(
    candidateId: string,
    result: MatchingResult,
  ): Promise<MatchingResult> {
    // If confidence is < 80%, force manual review
    if (result.confidence < 0.8) {
      result.requiresManualReview = true;
    }

    await this.prisma.studentPaymentCandidate.update({
      where: { id: candidateId },
      data: {
        studentId: result.studentId,
        matchingStrategy: result.strategy,
        confidence: result.confidence,
        manualReviewRequired: result.requiresManualReview,
        status: result.requiresManualReview
          ? 'MANUAL_REVIEW_REQUIRED'
          : 'MATCHED',
      },
    });

    return result;
  }
}
