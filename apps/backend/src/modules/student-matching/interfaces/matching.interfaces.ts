import { StudentPaymentCandidate } from '@prisma/client';

export interface IMatchingRepository {
  saveCandidate(
    data: Partial<StudentPaymentCandidate>,
  ): Promise<StudentPaymentCandidate>;
  findCandidateByPaymentId(
    paymentCandidateId: string,
  ): Promise<StudentPaymentCandidate | null>;
  logAttempt(attempt: any): Promise<void>;
  saveConflict(conflict: any): Promise<void>;
  saveMatch(match: any): Promise<void>;
  saveMatchingResult(candidateData: any, attemptData: any, matchesData: any[], conflictsData: any[]): Promise<any>;
}

export interface RuleEvaluationResult {
  matchedStudentIds: string[];
  score: number;
  ruleName: string;
}

export interface IMatchingRule {
  name: string;
  weight: number;
  evaluate(paymentCandidate: any): Promise<RuleEvaluationResult>;
}
