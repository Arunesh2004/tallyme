// entities/index.ts
import {
  PaymentReference,
  TransactionId,
  PaymentAmount,
  StudentRollNumber,
} from '../value-objects';
import { BaseEntity, AggregateRoot } from '../../../shared/domain/base'; // Assumes existing from Module 1

export class PaymentCandidate {
  constructor(
    public readonly id: string,
    public readonly reference: PaymentReference,
    public readonly transactionId: TransactionId,
    public readonly amount: PaymentAmount,
    public readonly paymentDate: Date,
    public readonly studentNameRaw: string,
    public readonly remarks: string,
    public status: 'PENDING' | 'MATCHED' | 'REVIEW' = 'PENDING',
  ) {}
}

export class StudentPayment {
  constructor(
    public readonly id: string,
    public readonly studentId: string,
    public readonly paymentCandidateId: string,
    public readonly amount: PaymentAmount,
  ) {}
}

export class FeeAllocation {
  constructor(
    public readonly id: string,
    public readonly studentPaymentId: string,
    public readonly outstandingFeeId: string,
    public readonly allocatedAmount: PaymentAmount,
  ) {}
}
