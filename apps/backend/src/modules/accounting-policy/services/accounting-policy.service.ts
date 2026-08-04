import { Injectable } from '@nestjs/common';
import { IAccountingPolicyEngine, ValidationResult, ValidationIssue } from '../interfaces/accounting-policy.interface';
import { CanonicalAccountingModel } from '../../universal-transaction/domain/types';
import { ValidationSeverity } from '../../universal-transaction/domain/enums';
import { Decimal } from 'decimal.js';
import { AccountingPeriodService } from './accounting-period.service';

@Injectable()
export class AccountingPolicyService implements IAccountingPolicyEngine {
  
  constructor(private readonly periodService: AccountingPeriodService) {}

  public async validateDraft(payload: CanonicalAccountingModel): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const normalizedPayload = JSON.parse(JSON.stringify(payload)) as CanonicalAccountingModel; // Deep copy for normalization

    // 1. Mandatory Header Validations
    if (!payload.header?.tenantId) {
      issues.push({ severity: ValidationSeverity.ERROR, message: 'Missing tenantId', fieldPath: 'header.tenantId' });
    }
    if (!payload.header?.transactionIntent) {
      issues.push({ severity: ValidationSeverity.ERROR, message: 'Missing transactionIntent', fieldPath: 'header.transactionIntent' });
    }
    if (!payload.header?.currency) {
      issues.push({ severity: ValidationSeverity.ERROR, message: 'Missing currency', fieldPath: 'header.currency' });
    }

    // 2. Ledger Entries Validations
    if (!payload.ledgerEntries || payload.ledgerEntries.length < 2) {
      issues.push({ severity: ValidationSeverity.ERROR, message: 'Transaction must contain at least 2 ledger entries', fieldPath: 'ledgerEntries' });
    } else {
      let totalDebits = new Decimal(0);
      let totalCredits = new Decimal(0);

      payload.ledgerEntries.forEach((entry, index) => {
        if (!entry.ledgerId) {
          issues.push({ severity: ValidationSeverity.ERROR, message: 'Orphan ledger entry missing ledgerId', fieldPath: `ledgerEntries[${index}].ledgerId` });
        }
        
        try {
          const amount = new Decimal(entry.amount || '0');
          if (amount.isNegative()) {
            issues.push({ severity: ValidationSeverity.ERROR, message: 'Amounts must be absolute positive values. Use isDebit flag to indicate side.', fieldPath: `ledgerEntries[${index}].amount` });
          }

          if (entry.isDebit) {
            totalDebits = totalDebits.plus(amount);
          } else {
            totalCredits = totalCredits.plus(amount);
          }
        } catch (e) {
          issues.push({ severity: ValidationSeverity.ERROR, message: 'Invalid decimal amount format', fieldPath: `ledgerEntries[${index}].amount` });
        }
      });

      // 3. Double-Entry Balance Invariant
      if (!totalDebits.equals(totalCredits)) {
        issues.push({ 
          severity: ValidationSeverity.ERROR, 
          message: `Debit and Credit mismatch. Total Debits: ${totalDebits.toString()}, Total Credits: ${totalCredits.toString()}`,
          fieldPath: 'ledgerEntries'
        });
      }
    }

    const errors = issues.filter(i => i.severity === ValidationSeverity.ERROR);
    const warnings = issues.filter(i => i.severity === ValidationSeverity.WARNING);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      normalizedPayload
    };
  }

  public async applyCompanyRules(tenantId: string, payload: CanonicalAccountingModel): Promise<ValidationResult> {
    const result = await this.validateDraft(payload);
    
    // Period validation
    try {
      const targetDate = new Date(payload.header.invoiceDate || payload.header.dueDate || Date.now());
      await this.periodService.validatePostingAllowed(payload.header.companyId, targetDate);
    } catch (e: any) {
      result.errors.push({ severity: ValidationSeverity.ERROR, message: e.message, fieldPath: 'header.invoiceDate' });
      result.valid = false;
    }
    
    if (result.normalizedPayload) {
      // Inject validation errors into the payload metadata
      result.normalizedPayload.metadata = result.normalizedPayload.metadata || { auditVersion: 1 };
      result.normalizedPayload.metadata.validationErrors = result.errors.map(i => i.message);
      result.normalizedPayload.metadata.warnings = result.warnings.map(i => i.message);
    }

    return result;
  }
}
