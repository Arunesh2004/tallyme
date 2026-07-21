// src/modules/student-fee/domain/services/fee-allocation.service.ts
import { Injectable } from '@nestjs/common';
import { PaymentCandidate, FeeAllocation } from '../entities';
import { StudentMatch } from './student-matching.service';
import { IOutstandingFeeRepository } from '../../fee-automation/domain/repositories';
import { PaymentAmount } from '../value-objects';
import { DecimalWrapper } from '../../../../infrastructure/prisma';
import * as crypto from 'crypto';

@Injectable()
export class OutstandingFeeResolver {
  constructor(private readonly feeRepo: IOutstandingFeeRepository) {}

  async resolve(studentId: string): Promise<any[]> {
    return this.feeRepo.findOutstandingFeesForStudent(studentId);
  }
}

@Injectable()
export class FeeAllocator {
  allocate(
    candidate: PaymentCandidate,
    match: StudentMatch,
    outstandingFees: any[],
  ): FeeAllocation[] {
    const allocations: FeeAllocation[] = [];
    let remaining = candidate.amount.amount.toNumber();

    // FIFO Allocation logic (Tuition first, then Transport)
    // Stub implementation assumes fees are sorted by priority
    for (const fee of outstandingFees) {
      if (remaining <= 0) break;

      const toAllocate = Math.min(fee.balance, remaining);
      remaining -= toAllocate;

      allocations.push(
        new FeeAllocation(
          crypto.randomUUID(),
          match.id, // Links to the StudentPayment/Match
          fee.id,
          new PaymentAmount(new DecimalWrapper(toAllocate)),
        ),
      );
    }

    // If remaining > 0, we have an advance payment, requiring special handling

    return allocations;
  }
}
