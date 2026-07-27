import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ILedgerMappingEngine,
  LedgerDecision,
} from './ledger-mapping.interface';

@Injectable()
export class LedgerMappingEngine implements ILedgerMappingEngine {
  constructor(private readonly prisma: PrismaService) {}

  async resolveExpenseLedger(
    vendorId: string,
    invoiceCategory?: string,
  ): Promise<LedgerDecision> {
    const config = await this.prisma.ledgerMappingConfiguration.findFirst();
    if (!config) {
      return this.unknownLedgerDecision();
    }

    if (invoiceCategory && config.feeCategories) {
      const categories = config.feeCategories as Record<string, string>;
      if (categories[invoiceCategory]) {
        return {
          selectedLedger: categories[invoiceCategory],
          confidence: 0.95,
          reason: 'Mapped by invoice category',
          appliedRule: 'CATEGORY_EXPENSE_MAPPING',
          configurationSource: 'LedgerMappingConfiguration',
          supportingEvidence: [`Category: ${invoiceCategory}`],
        };
      }
    }

    if (config.vendorLedger) {
      return {
        selectedLedger: config.vendorLedger,
        confidence: 0.9,
        reason: 'Fallback to default vendor expense ledger',
        appliedRule: 'DEFAULT_VENDOR_LEDGER',
        configurationSource: 'LedgerMappingConfiguration',
        supportingEvidence: [
          'No category matched, using default vendor ledger',
        ],
      };
    }

    return this.unknownLedgerDecision();
  }

  async resolveIncomeLedger(
    studentId: string,
    feeCategory?: string,
  ): Promise<LedgerDecision> {
    const config = await this.prisma.ledgerMappingConfiguration.findFirst();
    if (!config) {
      return this.unknownLedgerDecision();
    }

    if (feeCategory && config.feeCategories) {
      const categories = config.feeCategories as Record<string, string>;
      if (categories[feeCategory]) {
        return {
          selectedLedger: categories[feeCategory],
          confidence: 0.96,
          reason: 'Mapped by fee category',
          appliedRule: 'CATEGORY_INCOME_MAPPING',
          configurationSource: 'LedgerMappingConfiguration',
          supportingEvidence: [`Fee Category: ${feeCategory}`],
        };
      }
    }

    if (config.studentLedger) {
      return {
        selectedLedger: config.studentLedger,
        confidence: 0.9,
        reason: 'Fallback to default student income ledger',
        appliedRule: 'DEFAULT_STUDENT_LEDGER',
        configurationSource: 'LedgerMappingConfiguration',
        supportingEvidence: [
          'No category matched, using default student ledger',
        ],
      };
    }

    return this.unknownLedgerDecision();
  }

  async resolveGstLedger(taxType: string): Promise<LedgerDecision> {
    const config = await this.prisma.ledgerMappingConfiguration.findFirst();
    if (config && config.gstLedger) {
      return {
        selectedLedger: config.gstLedger,
        confidence: 0.95,
        reason: 'Mapped by global GST ledger configuration',
        appliedRule: 'GLOBAL_GST_MAPPING',
        configurationSource: 'LedgerMappingConfiguration',
        supportingEvidence: [`Tax Type: ${taxType}`],
      };
    }
    return this.unknownLedgerDecision();
  }

  private unknownLedgerDecision(): LedgerDecision {
    return {
      selectedLedger: 'UNKNOWN_LEDGER',
      confidence: 0,
      reason: 'No mapping exists',
      appliedRule: 'NONE',
      configurationSource: 'SYSTEM',
      supportingEvidence: [],
    };
  }
}
