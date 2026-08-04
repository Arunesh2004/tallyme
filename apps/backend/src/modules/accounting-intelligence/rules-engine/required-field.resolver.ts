import { Injectable } from '@nestjs/common';
import { 
  CompanyIntelligenceProfile, 
  ErpCapabilityProfile 
} from '../../universal-transaction/domain/readiness.types';

export interface FieldResolutionResult {
  requiredFields: string[];
  optionalFields: string[];
  hiddenFields: string[];
  readOnlyFields: string[];
}

export interface ResolverInput {
  companyProfile: CompanyIntelligenceProfile;
  erpProfile: ErpCapabilityProfile;
  voucherType: string;
  transactionIntent: string;
  documentType: string;
}

@Injectable()
export class RequiredFieldResolver {
  resolve(input: ResolverInput): FieldResolutionResult {
    const { companyProfile, erpProfile, voucherType, transactionIntent, documentType } = input;
    
    // Start with base ERP requirements
    const erpRequirements = erpProfile.requiredFieldsPerVoucherType?.[voucherType] || [];
    const required = new Set<string>(erpRequirements);
    const optional = new Set<string>();
    const hidden = new Set<string>();
    const readOnly = new Set<string>();

    // Basic fields required across the board
    required.add('invoiceNumber');
    required.add('invoiceDate');
    required.add('totalAmount');
    required.add('partyLedger');
    required.add('expenseLedger');

    // Dynamic resolution based on Company Configuration
    if (companyProfile.isBillWiseEnabled) {
      required.add('billReference');
    } else {
      hidden.add('billReference');
    }

    if (companyProfile.isCostCentreEnabled) {
      if (transactionIntent === 'EXPENSE' || transactionIntent === 'REVENUE') {
        required.add('costCentre');
      } else {
        optional.add('costCentre');
      }
    } else {
      hidden.add('costCentre');
    }

    if (companyProfile.isProjectTrackingEnabled) {
      optional.add('projectId');
    } else {
      hidden.add('projectId');
    }

    if (companyProfile.isInventoryTrackingEnabled && (voucherType === 'PURCHASE' || voucherType === 'SALES')) {
      required.add('inventoryItems');
    } else {
      hidden.add('inventoryItems');
    }

    if (companyProfile.gstRules?.enabled) {
      required.add('gstin');
      required.add('hsnSac');
    } else {
      hidden.add('gstin');
      hidden.add('hsnSac');
    }

    // Document Type specific
    if (documentType === 'FLIGHT_TICKET') {
      required.add('passengerName');
      required.add('ticketNumber');
    }

    // Read only fields
    readOnly.add('documentId');
    readOnly.add('tenantId');

    return {
      requiredFields: Array.from(required),
      optionalFields: Array.from(optional),
      hiddenFields: Array.from(hidden),
      readOnlyFields: Array.from(readOnly),
    };
  }
}
