import { Injectable } from '@nestjs/common';
import { PaymentCandidateDomain } from '../interfaces/parser.interfaces';

@Injectable()
export class ConfidenceEngine {
  calculate(candidate: Partial<PaymentCandidateDomain>): number {
    let score = 0;

    if (candidate.admissionNumber) score += 30;
    if (candidate.amount) score += 20;
    if (candidate.utr) score += 20;
    if (candidate.feeMonth) score += 15;
    if (candidate.transactionId) score += 15;

    // Cap at 100
    return Math.min(100, score);
  }
}
