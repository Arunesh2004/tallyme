import { Injectable } from '@nestjs/common';
import { ReadinessEngineInput, ReadinessResult, ReadinessGate } from '../domain/readiness.types';
import { RequiredFieldResolver } from '../../accounting-intelligence/rules-engine/required-field.resolver';

@Injectable()
export class VoucherReadinessEngine {
  constructor(private readonly requiredFieldResolver: RequiredFieldResolver) {}

  /**
   * Evaluates readiness without performing any validation itself.
   * It relies entirely on the consumed ValidationReport and intelligence profiles.
   */
  evaluate(input: ReadinessEngineInput): ReadinessResult {
    const { validationReport, companyProfile, erpProfile, historicalIntelligence, aiSuggestions, completionDraft, immutablePayload } = input;
    
    const missingRequiredFields: string[] = [];
    
    const voucherType = completionDraft.editablePayload?.header?.voucherType || immutablePayload.header.voucherType || 'JOURNAL';
    const transactionIntent = completionDraft.editablePayload?.header?.transactionIntent || immutablePayload.header.transactionIntent || 'EXPENSE';
    const documentType = completionDraft.editablePayload?.metadata?.documentType || (immutablePayload.metadata as any)?.documentType || 'INVOICE';

    const resolutionResult = this.requiredFieldResolver.resolve({
      companyProfile,
      erpProfile,
      voucherType,
      transactionIntent,
      documentType,
    });

    const allRequiredFields = new Set(resolutionResult.requiredFields);

    // 2. Check if required fields are present in the Completion Draft
    // (Falling back to immutable payload if not explicitly modified)
    const effectivePayload = {
      ...immutablePayload,
      ...completionDraft.editablePayload
    };

    if (allRequiredFields.has('vendorId') && !effectivePayload.parties?.vendorId) {
      missingRequiredFields.push('Vendor');
    }

    if (allRequiredFields.has('expenseLedger')) {
      const hasExpense = effectivePayload.ledgerEntries?.some((e: any) => e.isDebit);
      if (!hasExpense) {
        missingRequiredFields.push('Expense Ledger');
      }
    }

    if (allRequiredFields.has('costCentres')) {
      const hasCostCenter = effectivePayload.ledgerEntries?.some((e: any) => e.costCenters && e.costCenters.length > 0);
      if (!hasCostCenter) {
        missingRequiredFields.push('Cost Centre');
      }
    }

    if (allRequiredFields.has('narration') && !effectivePayload.header?.narration) {
      missingRequiredFields.push('Narration');
    }

    // 3. Compute Independent Gates
    const structuralGate: ReadinessGate = {
      pass: validationReport.structural.valid,
      reasons: validationReport.structural.errors
    };

    const businessGate: ReadinessGate = {
      pass: validationReport.business.valid,
      reasons: validationReport.business.errors
    };

    const erpGate: ReadinessGate = {
      pass: validationReport.erp.valid,
      reasons: validationReport.erp.errors
    };

    const userCompletionGate: ReadinessGate = {
      pass: missingRequiredFields.length === 0,
      reasons: missingRequiredFields.map(f => `Missing required field: ${f}`)
    };

    const isReady = structuralGate.pass && businessGate.pass && erpGate.pass && userCompletionGate.pass;

    // Combine Suggestions
    const suggestions = [...historicalIntelligence, ...aiSuggestions];

    return {
      isReady,
      gates: {
        structural: structuralGate,
        business: businessGate,
        erp: erpGate,
        userCompletion: userCompletionGate,
      },
      warnings: [...validationReport.structural.warnings, ...validationReport.business.warnings, ...validationReport.erp.warnings],
      missingRequiredFields,
      optionalFields: resolutionResult.optionalFields,
      hiddenFields: resolutionResult.hiddenFields,
      readOnlyFields: resolutionResult.readOnlyFields,
      suggestions,
      companyProfile,
      erpProfile,
    };
  }
}
