export interface ReplayDecision {
  stage: string;
  vendorLedgerId: string | null;
  confidence: number;
}

export interface ReplayResult {
  invoiceCandidateId: string;
  simulatedDecision: ReplayDecision;
  originalDecision: ReplayDecision;
  diffStatus: string;
}
