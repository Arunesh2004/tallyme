import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class PaymentIntelligenceEngine {
  private readonly logger = new Logger(PaymentIntelligenceEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluatePayment(paymentDetails: {
    bankReference?: string;
    email?: string;
    studentId?: string;
    amount: number;
  }) {
    this.logger.log(
      `Evaluating payment intelligence for reference ${paymentDetails.bankReference}`,
    );

    let matchConfidence = 0;
    let studentId: string | null = null;
    let matchReason: string | null = null;

    // 1. Direct Student ID Match
    if (paymentDetails.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { enrollmentNo: paymentDetails.studentId },
      });
      if (student) {
        matchConfidence = 0.99;
        studentId = student.id;
        matchReason = 'DIRECT_ID_MATCH';
        return { matchConfidence, studentId, matchReason };
      }
    }

    // 2. Email Match
    if (paymentDetails.email) {
      const student = await this.prisma.student.findFirst({
        where: { email: paymentDetails.email },
      });
      if (student) {
        matchConfidence = 0.95;
        studentId = student.id;
        matchReason = 'EMAIL_MATCH';
        return { matchConfidence, studentId, matchReason };
      }
    }

    // 3. Bank Reference Regex/Fuzzy Matching
    // E.g. finding "STD123" in bank reference string
    if (paymentDetails.bankReference) {
      // Find all students, this is obviously naive for large DBs, should use Full Text Search in prod
      const potentialMatch = paymentDetails.bankReference.toUpperCase();
      const student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { enrollmentNo: { contains: potentialMatch } },
            { firstName: { contains: potentialMatch } },
            { lastName: { contains: potentialMatch } },
          ],
        },
      });

      if (student) {
        matchConfidence = 0.85; // Lower confidence since it's a fuzzy substring match
        studentId = student.id;
        matchReason = 'BANK_REFERENCE_FUZZY_MATCH';
        return { matchConfidence, studentId, matchReason };
      }
    }

    return { matchConfidence: 0.0, studentId: null, matchReason: 'NO_MATCH' };
  }
}
