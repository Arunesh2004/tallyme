import { prisma } from '../../../../shared/db/prisma';

export interface ParsedPayment {
  admissionNumber?: string;
  studentName?: string;
  class?: string;
  utr: string;
  amount: number;
  feeMonth: string;
  gateway: string;
}

export interface MatchCandidate {
  student: any; // Prisma StudentProfile
  confidence: number;
}

export class WeightedMatchingStrategy {
  // Configurable weights (can be moved to DB or ENV later)
  private readonly WEIGHT_ADMISSION_NO = 60;
  private readonly WEIGHT_NAME = 25;
  private readonly WEIGHT_CLASS = 15;
  
  // High confidence threshold for automatic matching
  private readonly CONFIDENCE_THRESHOLD = 80;

  /**
   * Evaluates the payment against the Student directory using weighted scoring.
   */
  public async findMatch(payment: ParsedPayment): Promise<MatchCandidate | null> {
    const candidates: Map<string, MatchCandidate> = new Map();

    // 1. Admission Number (Highest Weight)
    if (payment.admissionNumber) {
      const student = await prisma.studentProfile.findUnique({
        where: { admissionNumber: payment.admissionNumber },
        include: { feeStructure: true }
      });

      if (student) {
        let confidence = this.WEIGHT_ADMISSION_NO;
        
        // Boost confidence if name/class also match
        if (payment.studentName && student.studentName.toLowerCase().includes(payment.studentName.toLowerCase())) {
          confidence += this.WEIGHT_NAME;
        }
        if (payment.class && student.class.toLowerCase() === payment.class.toLowerCase()) {
          confidence += this.WEIGHT_CLASS;
        }

        candidates.set(student.id, { student, confidence });
      }
    }

    // 2. Fallback: Name & Class Search (If admission number fails or wasn't provided)
    if (candidates.size === 0 && payment.studentName && payment.class) {
      const students = await prisma.studentProfile.findMany({
        where: {
          class: payment.class,
          studentName: {
            contains: payment.studentName,
            mode: 'insensitive' // Requires Prisma PostgreSQL provider
          }
        },
        include: { feeStructure: true }
      });

      for (const student of students) {
        candidates.set(student.id, { student, confidence: this.WEIGHT_NAME + this.WEIGHT_CLASS });
      }
    }

    // Determine the best candidate
    let bestCandidate: MatchCandidate | null = null;
    for (const candidate of candidates.values()) {
      if (!bestCandidate || candidate.confidence > bestCandidate.confidence) {
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }
}
