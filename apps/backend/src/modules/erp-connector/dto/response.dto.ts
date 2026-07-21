export interface ERPResponse {
  success: boolean;
  responseCode?: string;
  message?: string;
  referenceId?: string;
  voucherNumber?: string;
  rawStatus?: string;
  parserWarnings: string[];
  metadata?: Record<string, any>;
}
