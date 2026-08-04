import { CanonicalAccountingModel } from '../../universal-transaction/domain/types';
import { ValidationSeverity } from '../../universal-transaction/domain/enums';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  fieldPath?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  normalizedPayload?: CanonicalAccountingModel;
}

export interface IAccountingPolicyEngine {
  validateDraft(payload: CanonicalAccountingModel): Promise<ValidationResult>;
  applyCompanyRules(tenantId: string, payload: CanonicalAccountingModel): Promise<ValidationResult>;
}
