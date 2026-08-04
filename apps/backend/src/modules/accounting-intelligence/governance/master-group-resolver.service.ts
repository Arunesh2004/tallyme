import { Injectable, Logger } from '@nestjs/common';
import {
  AccountingParty,
  AccountingLineItem,
  AccountingTaxLine,
} from '../../../shared/domain/accounting-transaction';

export interface GroupResolutionResult {
  parentGroup: string;
  confidence: number;
  reason: string;
}

@Injectable()
export class MasterGroupResolverService {
  private readonly logger = new Logger(MasterGroupResolverService.name);

  resolvePartyGroup(party: AccountingParty): GroupResolutionResult {
    this.logger.debug(
      `Resolving group for party: ${party.ledgerName} of type: ${party.type}`,
    );

    if (party.type === 'VENDOR') {
      return {
        parentGroup: 'Sundry Creditors',
        confidence: 1.0,
        reason: 'Standard vendor categorization',
      };
    }
    if (party.type === 'STUDENT') {
      return {
        parentGroup: 'Sundry Debtors',
        confidence: 1.0,
        reason: 'Standard student categorization',
      };
    }
    if (party.type === 'EMPLOYEE') {
      return {
        parentGroup: 'Sundry Creditors',
        confidence: 0.8,
        reason: 'Employee payables treated as creditors',
      };
    }

    // Insufficient confidence for generic 'OTHER'
    return {
      parentGroup: '',
      confidence: 0.0,
      reason: 'Unrecognized party type requires manual review',
    };
  }

  resolveExpenseGroup(
    lineItem: AccountingLineItem,
    isPurchaseTransaction: boolean,
  ): GroupResolutionResult {
    this.logger.debug(`Resolving group for line item: ${lineItem.ledgerName}`);

    // If confidence is explicitly provided and it's too low, reject
    if (lineItem.confidence && lineItem.confidence.confidence < 0.6) {
      return {
        parentGroup: '',
        confidence: lineItem.confidence.confidence,
        reason: 'OCR/AI confidence too low for automated categorization',
      };
    }

    if (isPurchaseTransaction || lineItem.isDebit) {
      return {
        parentGroup: 'Indirect Expenses',
        confidence: 0.8,
        reason: 'Default fallback for unmapped purchase expenses',
      };
    } else {
      return {
        parentGroup: 'Indirect Incomes',
        confidence: 0.8,
        reason: 'Default fallback for unmapped receipts/incomes',
      };
    }
  }

  resolveTaxGroup(taxLine: AccountingTaxLine): GroupResolutionResult {
    this.logger.debug(`Resolving group for tax line: ${taxLine.ledgerName}`);
    return {
      parentGroup: 'Duties & Taxes',
      confidence: 1.0,
      reason: 'Standard statutory categorization',
    };
  }
}
