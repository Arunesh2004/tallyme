// services/index.ts
import { Injectable } from '@nestjs/common';
import { PaymentCandidate, StudentPayment, FeeAllocation } from '../entities';
import {
  IStudentRepository,
  IOutstandingFeeRepository,
} from '../../fee-automation/domain/repositories'; // From Module 5
import { Result, fail, ok } from '../../../shared/domain/result';

@Injectable()
export class StudentMatcher {
  constructor(private readonly studentRepo: IStudentRepository) {}

  async match(candidate: PaymentCandidate): Promise<Result<string, string>> {
    // Attempt match via Roll Number in remarks or name
    // Mocking matching logic for the vertical slice
    const student =
      await this.studentRepo.findStudentByEnrollmentNumber('STUB_ROLL');
    if (!student) {
      return fail('No confident match found. Requires manual review.');
    }
    return ok(student.id);
  }
}

@Injectable()
export class FeeAllocator {
  allocate(paymentAmount: number, outstandingFees: any[]): FeeAllocation[] {
    // Implement FIFO or priority-based allocation across tuition/transport
    return []; // Stub for slice
  }
}

@Injectable()
export class VoucherGenerator {
  generate(allocations: FeeAllocation[]): any {
    // Generates a double-entry VoucherCandidate
    return {};
  }
}

// policies/index.ts
@Injectable()
export class FeeValidationPolicy {
  validate(
    candidate: PaymentCandidate,
    studentId: string,
  ): Result<boolean, string> {
    if (candidate.amount.amount.toNumber() <= 0)
      return fail('Amount must be positive');
    // Implement closed session check, duplicate checks here
    return ok(true);
  }
}
