export interface MatchingResult {
  status: 'MATCHED' | 'FAILED' | 'DUPLICATE' | 'MANUAL_REVIEW';
  studentId?: string;
  admissionNumber?: string;
  studentName?: string;
  matchedFeeMonth: string;
  expectedAmount: number;
  paidAmount: number;
  balanceAmount: number;
  confidence: number;
  requiresManualReview: boolean;
  reason?: string;
  paymentFingerprint: string;
}
