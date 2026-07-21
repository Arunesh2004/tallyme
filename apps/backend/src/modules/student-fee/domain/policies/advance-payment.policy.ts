// src/modules/student-fee/domain/policies/advance-payment.policy.ts
import { Injectable } from '@nestjs/common';
import { PaymentCandidate, FeeAllocation } from '../entities';
import { PaymentAmount } from '../value-objects';
import { DecimalWrapper } from '../../../../infrastructure/prisma';
import * as crypto from 'crypto';

@Injectable()
export class AdvancePaymentPolicy {
  handleOverpayment(
    candidate: PaymentCandidate,
    allocations: FeeAllocation[],
  ): FeeAllocation | null {
    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + alloc.allocatedAmount.amount.toNumber(),
      0,
    );
    const paidAmount = candidate.amount.amount.toNumber();

    const overpaymentAmount = paidAmount - totalAllocated;

    // Due to precision, use an epsilon check (or IDecimal compare)
    if (overpaymentAmount > 0.01) {
      return new FeeAllocation(
        crypto.randomUUID(),
        candidate.id, // Linking back to payment match
        'ADVANCE_FEE_LEDGER_STUB',
        new PaymentAmount(new DecimalWrapper(overpaymentAmount)),
      );
    }

    return null;
  }
}
