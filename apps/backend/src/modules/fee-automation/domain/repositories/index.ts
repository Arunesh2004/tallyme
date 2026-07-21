import { ITransactionContext } from '../../../shared/domain/repositories';
import { Result } from '../../../shared/domain/result';

// Stubs for Domain Entities (Module 7/8 will implement real entities)
export type Student = { id: string };
export type OutstandingFee = { id: string };
export type PaymentCandidate = { id: string };
export type StudentPaymentCandidate = { id: string };

export interface IStudentRepository {
  findStudentByEnrollmentNumber(enrollmentNo: string): Promise<Student | null>;
  findStudentByEmail(email: string): Promise<Student | null>;
}

export interface IOutstandingFeeRepository {
  findOutstandingFeesForStudent(studentId: string): Promise<OutstandingFee[]>;
  lockAndGetOutstandingFee(
    feeId: string,
    tx: ITransactionContext,
  ): Promise<OutstandingFee | null>;
  saveFeeAllocation(
    fee: OutstandingFee,
    tx: ITransactionContext,
  ): Promise<void>;
}

export interface IPaymentCandidateRepository {
  saveIncomingPayment(
    candidate: PaymentCandidate,
    tx?: ITransactionContext,
  ): Promise<void>;
  findUnprocessedPayments(): Promise<PaymentCandidate[]>;
  markAsProcessed(candidateId: string, tx: ITransactionContext): Promise<void>;
}

export interface IStudentPaymentCandidateRepository {
  saveMatchedStudentPayment(
    candidate: StudentPaymentCandidate,
    tx: ITransactionContext,
  ): Promise<void>;
  findPendingFeeAllocations(): Promise<StudentPaymentCandidate[]>;
}
