// services/index.ts
export * from './student-matching.service';
export * from './fee-allocation.service';
export * from './student-voucher.orchestrator';

import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { PaymentCandidate } from '../entities';

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
