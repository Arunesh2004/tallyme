import { TransactionIntent, AccountingSide, ValidationSeverity } from './enums';

export interface TaxAndCompliance {
  gstInfo?: {
    gstin: string;
    placeOfSupply: string;
  };
  tds?: {
    section: string;
    amount: string; // Stored as decimal string to prevent precision loss
  };
  tcs?: {
    amount: string;
  };
  isRcm?: boolean;
}

export interface CostCenterAllocation {
  centerId: string;
  amount: string;
}

export interface ProjectAllocation {
  projectId: string;
  amount: string;
}

export interface BillAllocation {
  billRef: string;
  amount: string;
}

export interface LedgerEntry {
  ledgerId: string;
  amount: string;
  isDebit: boolean;
  costCenters?: CostCenterAllocation[];
  projects?: ProjectAllocation[];
  billAllocations?: BillAllocation[];
}

export interface InventoryEntry {
  itemId: string;
  godownId: string;
  batch: string;
  serialNumbers: string[];
  quantity: string;
  rate: string;
  amount: string;
}

export interface TransactionMetadata {
  attachments?: string[];
  aiConfidence?: string; // Decimal string
  validationErrors?: string[];
  errors?: string[];
  warnings?: string[];
  auditVersion: number;
  approvalMetadata?: {
    approvedBy: string;
    approvedAt: string; // ISO date string
  };
  erpMetadata?: {
    syncId: string;
    erpReferenceId: string;
  };
  documentHash?: string;
  completionDraft?: any; // Stores the versioned mutable Completion Draft while keeping base payload immutable
}

export interface TransactionHeader {
  tenantId: string;
  transactionIntent: TransactionIntent;
  voucherType?: string;
  companyId: string;
  financialYear: string;
  currency: string;
  exchangeRate: string;
  narration?: string;
  referenceNumbers?: string[];
  invoiceNumber?: string;
  invoiceDate?: string; // ISO format YYYY-MM-DD
  dueDate?: string; // ISO format YYYY-MM-DD
  paymentTerms?: string;
  status: string;
}

export interface TransactionParties {
  vendorId?: string;
  customerId?: string;
}

export interface CanonicalAccountingModel {
  header: TransactionHeader;
  parties: TransactionParties;
  taxAndCompliance?: TaxAndCompliance;
  ledgerEntries: LedgerEntry[];
  inventoryEntries?: InventoryEntry[];
  metadata: TransactionMetadata;
}
