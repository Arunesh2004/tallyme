import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ILedgerMappingEngine,
  LedgerDecision,
} from './ledger-mapping.interface';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class LedgerMappingEngine implements ILedgerMappingEngine {
  private readonly logger = new Logger(LedgerMappingEngine.name);

  // Hardcoded allowed chart of accounts
  private readonly allowedLedgers = [
    'Office Supplies',
    'Professional Fees',
    'Computer Equipment',
    'Travel Expenses',
    'Repairs and Maintenance',
    'Miscellaneous Expenses',
    'Printing and Stationery',
    'Software Subscriptions',
    'Furniture and Fixtures',
    'Bank Charges',
    'Rent Expense',
    'Marketing and Advertising',
    'Building Material Expense',
    'Electrical Equipment Expense',
    'Hardware / Maintenance Expense',
    'Cleaning Supplies Expense',
    'Office Consumables Expense',
    'General Consumables Expense',
  ];

  // HSN rules map
  private readonly hsnRules: Record<string, string> = {
    // Printing and Stationery
    '4802': 'Printing and Stationery',
    '4901': 'Printing and Stationery',
    '4820': 'Printing and Stationery',
    '9608': 'Printing and Stationery',
    '8443': 'Printing and Stationery',
    '8472': 'Printing and Stationery',

    // Building Material Expense
    '6904': 'Building Material Expense',
    '6905': 'Building Material Expense',
    '6810': 'Building Material Expense',
    '2523': 'Building Material Expense',
    '7214': 'Building Material Expense',

    // Electrical Equipment Expense
    '8414': 'Electrical Equipment Expense',
    '8504': 'Electrical Equipment Expense',
    '8536': 'Electrical Equipment Expense',
    '8544': 'Electrical Equipment Expense',
    '8418': 'Electrical Equipment Expense',

    // Hardware / Maintenance Expense
    '7318': 'Hardware / Maintenance Expense',
    '8205': 'Hardware / Maintenance Expense',
    '8302': 'Hardware / Maintenance Expense',
  };

  // Deterministic rules map (lowercase keyword matching)
  private readonly deterministicRules: Record<string, string> = {
    paper: 'Printing and Stationery',
    ink: 'Printing and Stationery',
    stationery: 'Printing and Stationery',
    stapler: 'Printing and Stationery',
    pen: 'Printing and Stationery',
    textbook: 'Printing and Stationery',
    notebook: 'Printing and Stationery',
    laptop: 'Computer Equipment',
    computer: 'Computer Equipment',
    hardware: 'Computer Equipment',
    consulting: 'Professional Fees',
    legal: 'Professional Fees',
    audit: 'Professional Fees',
    marketing: 'Marketing and Advertising',
    advertising: 'Marketing and Advertising',
    rent: 'Rent Expense',
    repair: 'Repairs and Maintenance',
    service: 'Repairs and Maintenance',
    maintenance: 'Repairs and Maintenance',
    installation: 'Repairs and Maintenance',
    travel: 'Travel Expenses',
    flight: 'Travel Expenses',
    hotel: 'Travel Expenses',
    furniture: 'Furniture and Fixtures',
    chair: 'Furniture and Fixtures',
    desk: 'Furniture and Fixtures',
    software: 'Software Subscriptions',
    subscription: 'Software Subscriptions',
    bank: 'Bank Charges',
    charge: 'Bank Charges',
    cement: 'Repairs and Maintenance',
    led: 'Electrical Equipment Expense',
    tube: 'Electrical Equipment Expense',
    bulb: 'Electrical Equipment Expense',
    fan: 'Electrical Equipment Expense',
    switch: 'Electrical Equipment Expense',
    bolt: 'Repairs and Maintenance',
    chalk: 'Office Consumables Expense',
    duster: 'Cleaning Supplies Expense',
    mop: 'Cleaning Supplies Expense',
    'cleaning cloth': 'Cleaning Supplies Expense',
    detergent: 'Cleaning Supplies Expense',
  };

  constructor(private readonly prisma: PrismaService) {}

  async resolveExpenseLedger(
    vendorId: string,
    invoiceCategory?: string,
    hsnSac?: string,
  ): Promise<LedgerDecision> {
    const config = await this.prisma.ledgerMappingConfiguration.findFirst();

    // Check if we are passing a line item description in the 'invoiceCategory' parameter
    if (invoiceCategory) {
      const description = invoiceCategory.toLowerCase();

      // 0. HSN Mapping
      if (hsnSac && this.hsnRules[hsnSac]) {
        return {
          selectedLedger: this.hsnRules[hsnSac],
          confidence: 0.99,
          reason: `Mapped deterministically by HSN: ${hsnSac}`,
          appliedRule: 'HSN_MAPPING',
          configurationSource: 'LedgerMappingEngine',
          supportingEvidence: [`HSN: ${hsnSac}`],
          hsnMatch: true,
          keywordMatch: false,
          geminiMatch: false,
        };
      }

      // 1. Deterministic Mapping
      for (const [keyword, ledger] of Object.entries(this.deterministicRules)) {
        if (description.includes(keyword)) {
          return {
            selectedLedger: ledger,
            confidence: 0.95,
            reason: `Mapped deterministically by keyword: ${keyword}`,
            appliedRule: 'DETERMINISTIC_LINE_ITEM_MAPPING',
            configurationSource: 'LedgerMappingEngine',
            supportingEvidence: [`Description: ${invoiceCategory}`],
            hsnMatch: false,
            keywordMatch: true,
            geminiMatch: false,
          };
        }
      }

      // 2. AI Fallback
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Classify the following invoice line item description into exactly ONE of the allowed accounting ledgers.
Description: "${invoiceCategory}"
HSN: ${hsnSac || 'Not provided'}

Allowed Ledgers:
${this.allowedLedgers.join('\n')}

Rules:
1. You must respond with EXACTLY the ledger name from the allowed list, nothing else. No explanation, no quotes.
2. If none match perfectly, output UNKNOWN_LEDGER.
3. You MUST respond with a raw JSON object containing exactly these fields:
{
 "ledgerCategory": "",
 "confidence": 0.0,
 "reasoning": ""
}
`;
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const resultText = response.text?.trim() || '{}';
          const parsed = JSON.parse(resultText);
          const ledgerCat = parsed.ledgerCategory || 'UNKNOWN_LEDGER';

          if (this.allowedLedgers.includes(ledgerCat)) {
            return {
              selectedLedger: ledgerCat,
              confidence: parsed.confidence || 0.85,
              reason: parsed.reasoning || 'Mapped via AI classification',
              appliedRule: 'AI_LINE_ITEM_CLASSIFICATION',
              configurationSource: 'Gemini',
              supportingEvidence: [`Description: ${invoiceCategory}`],
              hsnMatch: false,
              keywordMatch: false,
              geminiMatch: true,
            };
          } else {
            return this.unknownLedgerDecision(ledgerCat);
          }
        }
      } catch (err: any) {
        this.logger.warn(`AI classification failed: ${err.message}`);
      }
    }

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

    return this.unknownLedgerDecision(invoiceCategory || 'Unknown');
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
    // Dynamic GST mapping based on standard Tally ledger naming patterns
    let mappedLedger = 'Input GST';
    if (taxType.toUpperCase() === 'CGST') mappedLedger = 'Input CGST Ledger';
    else if (taxType.toUpperCase() === 'SGST')
      mappedLedger = 'Input SGST Ledger';
    else if (taxType.toUpperCase() === 'IGST')
      mappedLedger = 'Input IGST Ledger';
    else if (taxType.toUpperCase() === 'CESS')
      mappedLedger = 'Input Cess Ledger';

    return {
      selectedLedger: mappedLedger,
      confidence: 1.0,
      reason: 'Deterministic tax mapping',
      appliedRule: 'DYNAMIC_GST_MAPPING',
      configurationSource: 'System',
      supportingEvidence: [`Tax Type: ${taxType}`],
    };
  }

  private unknownLedgerDecision(suggested?: string): LedgerDecision {
    return {
      selectedLedger: 'UNKNOWN_LEDGER',
      confidence: 0,
      reason: 'No mapping exists',
      appliedRule: 'NONE',
      configurationSource: 'SYSTEM',
      supportingEvidence: [],
      suggestedCategory: suggested
        ? `Consider creating rule for ${suggested}`
        : 'Unknown',
    };
  }
}
