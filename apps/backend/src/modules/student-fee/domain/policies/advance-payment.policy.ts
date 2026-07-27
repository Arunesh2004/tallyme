// src/modules/student-fee/domain/policies/advance-payment.policy.ts
import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { PaymentCandidate, FeeAllocation } from '../entities';
import { PaymentAmount } from '../value-objects';
import { DecimalWrapper } from '../../../../infrastructure/prisma';
import * as crypto from 'crypto';

@Injectable()
export class AdvancePaymentPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async handleOverpayment(
    candidate: PaymentCandidate,
    allocations: FeeAllocation[],
  ): Promise<FeeAllocation | null> {
    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + alloc.allocatedAmount.amount.toNumber(),
      0,
    );
    const paidAmount = candidate.amount.amount.toNumber();

    const overpaymentAmount = paidAmount - totalAllocated;

    // Due to precision, use an epsilon check (or IDecimal compare)
    if (overpaymentAmount > 0.01) {
      const mapping = await this.prisma.ledgerMappingConfiguration.findFirst();
      const advanceLedger = mapping?.studentLedger || 'Advance Fee Ledger';

      return new FeeAllocation(
        crypto.randomUUID(),
        candidate.id, // Linking back to payment match
        advanceLedger,
        new PaymentAmount(new DecimalWrapper(overpaymentAmount)),
      );
    }

    return null;
  }
}
