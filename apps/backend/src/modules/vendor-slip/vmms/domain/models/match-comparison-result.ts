export enum ComparisonCategory {
  MATCH = 'MATCH',
  MISMATCH = 'MISMATCH',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  UNKNOWN = 'UNKNOWN',
}

export interface MatchComparisonResult {
  invoiceId: string;
  legacyVendorId: string | null;
  vmmsLedgerId: string | null;
  category: ComparisonCategory;
  discrepancyReason: string;
  marginDelta: number;
  timestamp: Date;
  invoiceNumber: string | null;
  legacyVendorName: string | null;
  vmmsVendorName: string | null;
}
