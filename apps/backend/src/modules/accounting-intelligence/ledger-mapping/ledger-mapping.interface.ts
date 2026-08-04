export interface LedgerDecision {
  selectedLedger: string;
  reason: string;
  confidence: number;
  appliedRule: string;
  configurationSource: string;
  supportingEvidence: string[];
  suggestedCategory?: string;
  hsnMatch?: boolean;
  keywordMatch?: boolean;
  geminiMatch?: boolean;
}

export interface ILedgerMappingEngine {
  resolveExpenseLedger(
    vendorId: string,
    invoiceCategory?: string,
    hsnSac?: string,
  ): Promise<LedgerDecision>;
  resolveIncomeLedger(
    studentId: string,
    feeCategory?: string,
  ): Promise<LedgerDecision>;
  resolveGstLedger(taxType: string): Promise<LedgerDecision>;
}
