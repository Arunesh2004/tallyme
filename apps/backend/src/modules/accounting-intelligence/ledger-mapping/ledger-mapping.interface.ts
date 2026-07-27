export interface LedgerDecision {
  selectedLedger: string;
  reason: string;
  confidence: number;
  appliedRule: string;
  configurationSource: string;
  supportingEvidence: string[];
}

export interface ILedgerMappingEngine {
  resolveExpenseLedger(
    vendorId: string,
    invoiceCategory?: string,
  ): Promise<LedgerDecision>;
  resolveIncomeLedger(
    studentId: string,
    feeCategory?: string,
  ): Promise<LedgerDecision>;
  resolveGstLedger(taxType: string): Promise<LedgerDecision>;
}
