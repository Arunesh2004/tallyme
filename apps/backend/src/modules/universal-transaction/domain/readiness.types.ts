import { CanonicalAccountingModel } from './types';

export interface ValidationReport {
  structural: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  business: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  erp: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  blockingIssues: string[];
}

export interface CompanyIntelligenceProfile {
  isBillWiseEnabled: boolean;
  isCostCentreEnabled: boolean;
  isProjectTrackingEnabled: boolean;
  isInventoryTrackingEnabled: boolean;
  gstRules: any;
  branchRules: any;
}

export interface ErpCapabilityProfile {
  supportedVoucherTypes: string[];
  requiredFieldsPerVoucherType: Record<string, string[]>;
  erpType: string;
}

export interface HistoricalSuggestion {
  field: string;
  suggestedValue: string;
  confidence: number;
  source: 'HISTORICAL' | 'AI';
  reason: string;
}

export interface VoucherCompletionDraft {
  originalDraftId: string;
  editablePayload: any; // The delta or merged payload reflecting user edits
  version: number;
}

export interface ReadinessGate {
  pass: boolean;
  reasons: string[];
}

export interface ReadinessResult {
  isReady: boolean;
  gates: {
    structural: ReadinessGate;
    business: ReadinessGate;
    erp: ReadinessGate;
    userCompletion: ReadinessGate;
  };
  warnings: string[];
  missingRequiredFields: string[];
  optionalFields: string[];
  hiddenFields: string[];
  readOnlyFields: string[];
  suggestions: HistoricalSuggestion[];
  companyProfile?: CompanyIntelligenceProfile;
  erpProfile?: ErpCapabilityProfile;
}

export interface ReadinessEngineInput {
  validationReport: ValidationReport;
  companyProfile: CompanyIntelligenceProfile;
  erpProfile: ErpCapabilityProfile;
  historicalIntelligence: HistoricalSuggestion[];
  aiSuggestions: HistoricalSuggestion[];
  completionDraft: VoucherCompletionDraft;
  immutablePayload: CanonicalAccountingModel;
}
