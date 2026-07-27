import { FeeAllocationCandidate } from '@prisma/client';

export interface IFeeValidationRepository {
  saveCandidate(data: any): Promise<FeeAllocationCandidate>;
  findCandidateById(id: string): Promise<FeeAllocationCandidate | null>;
  findStudentPaymentCandidateById(id: string): Promise<any>;
  getStudentOutstandings(studentId: string): Promise<any[]>;
  logValidation(log: any): Promise<void>;
  saveException(exception: any): Promise<void>;
  saveValidationResult(
    candidateData: any,
    logData: any,
    exceptionsData: any[],
  ): Promise<any>;
}

export interface RuleValidationResult {
  ruleName: string;
  isValid: boolean;
  warnings: string[];
  statusModifier?: string;
  isDuplicate?: boolean;
}

export interface IFeeValidationRule {
  name: string;
  evaluate(
    paymentData: any,
    studentProfile: any,
  ): Promise<RuleValidationResult>;
}
