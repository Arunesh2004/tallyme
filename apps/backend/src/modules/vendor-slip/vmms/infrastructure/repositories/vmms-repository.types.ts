export interface VendorBranchDomain {
  id: string;
  vendorId: string;
  companyId: string;
  gstin: string;
  status: string;
}

export interface VendorLedgerDomain {
  id: string;
  vendorBranchId: string;
  companyId: string;
  erpLedgerCode: string;
  status: string;
  defaultExpenseCategory: string | null;
}

export interface VendorMatchDecisionPayload {
  invoiceCandidateId: string;
  selectedVendorLedgerId: string;
  isAutomated: boolean;
  matchEvidence: any;
}
