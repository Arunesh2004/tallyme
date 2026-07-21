// src/modules/student-fee/domain/services/student-matching.service.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { PaymentCandidate } from '../entities';
import {
  IStudentRepository,
  IPaymentRepository,
} from '../../fee-automation/domain/repositories';
import { DuplicatePaymentError } from '../../vendor-slip/exceptions/repository.exceptions'; // Shared exception pattern
import * as crypto from 'crypto';

export class StudentMatch {
  constructor(
    public readonly id: string,
    public readonly candidateId: string,
    public readonly studentId: string,
    public readonly confidence: number,
    public readonly matchType: string,
  ) {}
}

@Injectable()
export class DuplicatePaymentDetector {
  constructor(private readonly paymentRepo: IPaymentRepository) {}

  async detect(
    candidate: PaymentCandidate,
  ): Promise<Result<boolean, DuplicatePaymentError>> {
    // Exact duplicate transaction ID check
    const existing = await this.paymentRepo.findByTransactionId(
      candidate.transactionId.value,
    );
    if (existing) {
      return fail(
        new DuplicatePaymentError('SYSTEM', candidate.transactionId.value),
      );
    }
    return ok(false);
  }
}

@Injectable()
export class StudentMatcher {
  constructor(private readonly studentRepo: IStudentRepository) {}

  async match(
    candidate: PaymentCandidate,
  ): Promise<Result<StudentMatch, string>> {
    // 1. Try Reference Number as Roll Number
    const student = await this.studentRepo.findStudentByEnrollmentNumber(
      candidate.reference.value,
    );
    if (student) {
      return ok(
        new StudentMatch(
          crypto.randomUUID(),
          candidate.id,
          student.id,
          99,
          'EXACT_ROLL',
        ),
      );
    }

    // 2. Fallback to Email (if parsed)
    // 3. Fallback to fuzzy Name match (stubbed for now)

    return fail('No student matched. Manual review required.');
  }
}

@Injectable()
export class StudentManualReviewPolicy {
  evaluate(
    candidate: PaymentCandidate,
    matchResult: Result<StudentMatch, string>,
  ): boolean {
    if (matchResult.isFailure) return true;
    const match = matchResult.getValue();
    if (match.confidence < 85) return true;
    return false;
  }
}
