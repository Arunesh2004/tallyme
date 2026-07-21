export interface IdempotencyCheckRequest {
  companyId: string;
  voucherCandidateId: string;
  voucherNumber: string;
}

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  jobId?: string;
  status?: string;
}
