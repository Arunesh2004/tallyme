import { Injectable, Logger } from '@nestjs/common';
import { LedgerMappingEngine } from '../ledger-mapping/ledger-mapping.engine';
import { AccountingRulesEngine } from '../rules-engine/accounting-rules.engine';
import { AccountingDecisionAuditService } from '../decision-audit/accounting-decision-audit.service';
import { ValidationStatus } from '../../../shared/domain/extraction-confidence';
import {
  AccountingTransaction,
  TransactionType,
} from '../../../shared/domain/accounting-transaction';

export interface GenerateVoucherPayloadRequest {
  candidateId: string;
  companyId: string;
  batchSyncItemId?: string;
  domainCandidate: any;
  vendorLedgerName: string;
  vendorId?: string;
  normalizedConfidence: number;
}

export class InvoiceDiscrepancyResolver {
  static analyze(candidateId: string, extractedData: any): any {
    if (!extractedData || extractedData.amount === null) {
      return {
        expectedTotal: 0,
        calculatedTotal: 0,
        difference: 0,
        detectedIssues: ['OCR_INCONSISTENCY'],
        suggestedRecoveries: [],
        confidence: 0,
        finalDecision: 'MANUAL_REVIEW',
        reason: 'Core extraction value (amount) is missing.',
        suggestedAction: 'Verify OCR extraction quality.',
      };
    }

    const expectedTotal = extractedData.amount || 0;

    const extractedTaxes =
      (extractedData.cgst || 0) +
      (extractedData.sgst || 0) +
      (extractedData.igst || 0) +
      (extractedData.cess || 0);

    const subtotal =
      extractedData.subtotal !== null && extractedData.subtotal !== undefined
        ? extractedData.subtotal
        : expectedTotal - extractedTaxes;

    const charges =
      (extractedData.freight || 0) + (extractedData.otherCharges || 0);
    const discount = extractedData.discount || 0;
    const roundOff = extractedData.roundOff || 0;

    let calculatedTotal =
      subtotal + extractedTaxes + charges - discount + roundOff;
    let difference = calculatedTotal - expectedTotal; // Positive means we calculated more than invoice total
    const detectedIssues: string[] = [];
    const suggestedRecoveries: any[] = [];
    let confidence = 1.0;
    let finalDecision = 'BALANCED';
    let reason = '';
    let suggestedAction = '';

    // Check for missing individual GST when taxAmount exists
    if (extractedTaxes === 0 && extractedData.taxAmount > 0) {
      detectedIssues.push('MISSING_CGST', 'MISSING_SGST');
      const half = Number((extractedData.taxAmount / 2).toFixed(2));
      suggestedRecoveries.push({ type: 'CGST', amount: half });
      suggestedRecoveries.push({
        type: 'SGST',
        amount: extractedData.taxAmount - half,
      });
      calculatedTotal += extractedData.taxAmount;
      difference = calculatedTotal - expectedTotal;
    }

    if (Math.abs(difference) > 0.01) {
      if (Math.abs(difference) <= 5 && roundOff === 0) {
        detectedIssues.push('ROUND_OFF_DIFFERENCE');
        suggestedRecoveries.push({ type: 'ROUND_OFF', amount: -difference }); // If diff is positive, we need negative roundoff
        difference = 0;
      } else if (difference > 5) {
        detectedIssues.push('MISSING_DISCOUNT');
        finalDecision = 'MANUAL_REVIEW';
        confidence = 0;
        reason = `Invoice total differs by ₹${difference} because discount was not extracted.`;
        suggestedAction = 'Verify extracted discount value.';
      } else if (difference < -5) {
        detectedIssues.push('UNKNOWN');
        finalDecision = 'MANUAL_REVIEW';
        confidence = 0;
        reason = `Invoice total differs by ₹${Math.abs(difference)}. Missing charges or taxes not extracted.`;
        suggestedAction = 'Verify extracted freight, charges, or taxes.';
      }
    }

    return {
      expectedTotal,
      calculatedTotal,
      difference,
      detectedIssues,
      suggestedRecoveries,
      confidence,
      finalDecision,
      reason,
      suggestedAction,
    };
  }
}

@Injectable()
export class AccountingIntelligenceService {
  private readonly logger = new Logger(AccountingIntelligenceService.name);

  constructor(
    private readonly ledgerMappingEngine: LedgerMappingEngine,
    private readonly rulesEngine: AccountingRulesEngine,
    private readonly auditService: AccountingDecisionAuditService,
  ) {}

  async generateVoucherPayload(
    req: GenerateVoucherPayloadRequest,
  ): Promise<any> {
    const {
      candidateId,
      companyId,
      batchSyncItemId,
      domainCandidate,
      vendorLedgerName,
      vendorId,
      normalizedConfidence,
    } = req;

    const extractedData = domainCandidate.extractedData || {};
    const lineItems = extractedData.lineItems || [];

    let totalDebit = 0;
    const lines: any[] = [];
    const ledgerDecisions: any = {
      vendor: {
        name: vendorLedgerName,
        confidence: normalizedConfidence,
        source: 'VendorMatchingEngine',
      },
      lineItems: [],
      taxes: {},
      reconciliationAuditLog: {},
    };

    // 0. Invoice Discrepancy Resolver (Phase F4)
    const discrepancyAnalysis = InvoiceDiscrepancyResolver.analyze(
      candidateId,
      extractedData,
    );

    if (discrepancyAnalysis.finalDecision === 'MANUAL_REVIEW') {
      const errorPayload = {
        invoiceId: candidateId,
        reason: discrepancyAnalysis.reason,
        suggestedAction: discrepancyAnalysis.suggestedAction,
      };
      throw new Error(JSON.stringify(errorPayload));
    }

    // Apply safe auto-recoveries from the discrepancy analysis
    for (const rec of discrepancyAnalysis.suggestedRecoveries) {
      if (rec.type === 'CGST') extractedData.cgst = rec.amount;
      if (rec.type === 'SGST') extractedData.sgst = rec.amount;
      if (rec.type === 'ROUND_OFF')
        extractedData.roundOff = (extractedData.roundOff || 0) + rec.amount;
    }

    let taxRecoveredAmt = 0;

    let lineItemsSum = 0;
    if (lineItems.length > 0) {
      for (const item of lineItems) {
        const amount = item.amount || 0;
        if (amount > 0) {
          const description = item.description || 'Miscellaneous Item';
          const decision = await this.ledgerMappingEngine.resolveExpenseLedger(
            vendorId || 'UNKNOWN',
            description,
            item.hsnSac,
          );

          if (decision.selectedLedger === 'UNKNOWN_LEDGER') {
            throw new Error(
              JSON.stringify({
                item: description,
                hsn: item.hsnSac || null,
                reason: 'No ledger mapping found',
                suggestedCategory: decision.suggestedCategory || 'Unknown',
              }),
            );
          }

          lines.push({
            ledger: decision.selectedLedger,
            amount: amount,
            hsnSac: item.hsnSac || null,
            rate: item.rate || null,
            quantity: item.quantity || null,
          });
          totalDebit += amount;
          lineItemsSum += amount;

          ledgerDecisions.lineItems.push({
            description,
            hsn: item.hsnSac || null,
            hsnMatch: decision.hsnMatch || false,
            keywordMatch: decision.keywordMatch || false,
            geminiMatch: decision.geminiMatch || false,
            finalLedger: decision.selectedLedger,
            confidence: decision.confidence,
            source: decision.configurationSource,
          });
        }
      }
    }

    // Fallback if no line items or line items sum is less than subtotal
    let subtotal = extractedData.subtotal || 0;
    if (subtotal <= 0 && extractedData.amount > 0) {
      const taxes =
        (extractedData.cgst || 0) +
        (extractedData.sgst || 0) +
        (extractedData.igst || 0) +
        (extractedData.cess || 0);
      subtotal = extractedData.amount - taxes;
    }

    if (subtotal > 0 && lineItemsSum < subtotal) {
      const remainingSubtotal = subtotal - lineItemsSum;
      lines.push({
        ledger: 'Miscellaneous Expenses',
        amount: remainingSubtotal,
      });
      totalDebit += remainingSubtotal;
    }

    // 2. GST Handling (Deterministic)
    const taxes = [
      { key: 'cgst', type: 'CGST' },
      { key: 'sgst', type: 'SGST' },
      { key: 'igst', type: 'IGST' },
      { key: 'cess', type: 'CESS' },
    ];

    for (const tax of taxes) {
      const amount = extractedData[tax.key];
      if (amount && amount > 0) {
        const decision = await this.ledgerMappingEngine.resolveGstLedger(
          tax.type,
        );
        lines.push({
          ledger: decision.selectedLedger,
          amount: amount,
        });
        totalDebit += amount;
        ledgerDecisions.taxes[tax.type] = {
          name: decision.selectedLedger,
          confidence: decision.confidence,
        };
      }
    }

    // 3. Adjustments Handling
    // Freight/Other Charges increase total debit
    const freight = extractedData.freight || 0;
    if (freight > 0) {
      lines.push({ ledger: 'Freight Charges', amount: freight });
      totalDebit += freight;
    }

    const otherCharges = extractedData.otherCharges || 0;
    if (otherCharges > 0) {
      lines.push({ ledger: 'Other Charges', amount: otherCharges });
      totalDebit += otherCharges;
    }

    // Discounts decrease total vendor credit (we treat them as credits against the total, or negative debits)
    // Tally often uses a "Discount Received" income ledger on the credit side.
    const discount = extractedData.discount || 0;
    let totalCredit = extractedData.amount || totalDebit;

    // We will pass discount separately so Voucher Builder can put it on the credit side.
    const credits: any[] = [
      {
        ledger: vendorLedgerName,
        amount: extractedData.amount || totalDebit - discount, // Default to extracted total
        isVendor: true,
      },
    ];

    if (discount > 0) {
      credits.push({
        ledger: 'Discount Received',
        amount: discount,
      });
      totalCredit += discount; // totalCredit now matches totalDebit mathematically
    }

    const roundOff = extractedData.roundOff || 0;
    // We expect Debit = Credit. If not, Round Off ledger adjusts it.
    // If roundOff is extracted, we can just apply it. Let's do auto-balancing.
    const rawVendorAmount = credits.find((c) => c.isVendor)?.amount || 0;
    const creditSum = credits.reduce((sum, c) => sum + c.amount, 0);
    let diff = totalDebit - creditSum;

    if (Math.abs(diff) > 0.01) {
      // Tax Recovery: Before rejecting balance mismatch: Verify extracted tax fields.
      // If invoice contains GST but ledger entries are missing (perhaps failed to map or missing from array), create them automatically.
      if (Math.abs(diff) > 5 && diff < 0) {
        // Credit > Debit, meaning we are missing expenses/taxes
        const hasCgst = lines.some((l) => l.ledger.includes('CGST'));
        const hasSgst = lines.some((l) => l.ledger.includes('SGST'));
        const hasIgst = lines.some((l) => l.ledger.includes('IGST'));
        const hasCess = lines.some((l) => l.ledger.includes('Cess'));

        let recoveredTax = 0;
        if (!hasCgst && extractedData.cgst > 0) {
          const d = await this.ledgerMappingEngine.resolveGstLedger('CGST');
          lines.push({ ledger: d.selectedLedger, amount: extractedData.cgst });
          recoveredTax += extractedData.cgst;
        }
        if (!hasSgst && extractedData.sgst > 0) {
          const d = await this.ledgerMappingEngine.resolveGstLedger('SGST');
          lines.push({ ledger: d.selectedLedger, amount: extractedData.sgst });
          recoveredTax += extractedData.sgst;
        }
        if (!hasIgst && extractedData.igst > 0) {
          const d = await this.ledgerMappingEngine.resolveGstLedger('IGST');
          lines.push({ ledger: d.selectedLedger, amount: extractedData.igst });
          recoveredTax += extractedData.igst;
        }
        if (!hasCess && extractedData.cess > 0) {
          const d = await this.ledgerMappingEngine.resolveGstLedger('CESS');
          lines.push({ ledger: d.selectedLedger, amount: extractedData.cess });
          recoveredTax += extractedData.cess;
        }
        if (recoveredTax > 0) {
          totalDebit += recoveredTax;
          taxRecoveredAmt = recoveredTax;
          diff = totalDebit - creditSum;
        }
      }

      if (Math.abs(diff) <= 5) {
        // Apply to rounding off ledger
        if (diff > 0) {
          // Debit > Credit -> We need more Credit
          credits.push({ ledger: 'Rounding Off', amount: diff });
        } else {
          // Credit > Debit -> We need more Debit
          lines.push({ ledger: 'Rounding Off', amount: Math.abs(diff) });
          totalDebit += Math.abs(diff);
        }
      } else {
        throw new Error(
          `Unexplained balance difference of ${diff} exceeds 5. Manual review required.`,
        );
      }
    }

    ledgerDecisions.reconciliationAuditLog = {
      invoiceTotal: extractedData.amount || 0,
      calculatedTotal: discrepancyAnalysis.calculatedTotal,
      difference: diff, // ledger generation difference
      taxRecovered: taxRecoveredAmt,
      adjustmentsApplied: { discount, freight, otherCharges, roundOff },
      finalDecision: 'BALANCED',
      componentsFound: [],
      componentsRecovered: discrepancyAnalysis.suggestedRecoveries.map(
        (r: any) => r.type,
      ),
    };

    // Safety Validations
    if (totalDebit <= 0) {
      throw new Error(
        'Voucher validation failed: Total amount must be greater than 0',
      );
    }
    if (lines.length === 0) {
      throw new Error(
        'Voucher validation failed: No debit lines generated (Debit = 0)',
      );
    }
    if (credits.length === 0) {
      throw new Error(
        'Voucher validation failed: No credit lines generated (Credit = 0)',
      );
    }
    if (!vendorLedgerName) {
      throw new Error('Voucher validation failed: Missing vendor ledger');
    }

    // 4. AccountingTransaction Validation
    const accTx = new AccountingTransaction(
      candidateId,
      companyId,
      TransactionType.PURCHASE,
      'VENDOR_SLIP',
      domainCandidate.invoiceDate?.value || new Date(),
      [
        {
          id: vendorId || 'VMMS',
          type: 'VENDOR',
          ledgerName: vendorLedgerName,
        },
      ],
      lines.map((l: any, idx: number) => ({
        id: `line-${idx + 1}`,
        ledgerName: l.ledger,
        amount: Number(l.amount),
        isDebit: true,
      })),
      [],
      totalDebit,
      { invoiceNumber: domainCandidate.invoiceNumber?.value },
      [],
      ValidationStatus.AUTO_APPROVED,
    );

    const ruleDecision = await this.rulesEngine.evaluate(accTx);
    if (ruleDecision.requiresApproval) {
      throw new Error(`Rules Engine rejected: ${ruleDecision.explanation}`);
    }

    // Log decision
    await this.auditService.logDecision({
      companyId,
      inputData: {
        candidateId,
        vendorName: extractedData.vendorName || 'Acme Corp',
        amount: totalDebit,
      },
      ledgerDecision: { selectedLedger: lines[0]?.ledger || 'UNKNOWN' } as any,
      appliedRules: ruleDecision.appliedRules,
      confidence: ruleDecision.confidence,
    });

    // 5. Build Final Generic Payload for Voucher Builder
    return {
      voucherType: ruleDecision.voucherType,
      candidateId: domainCandidate.id,
      batchSyncItemId,
      companyId: companyId,
      allocation: {
        totalAmount: totalDebit, // legacy compat
        vendorLedger: vendorLedgerName,
        debitLines: lines,
        creditLines: credits,
      },
      invoice: {
        number: domainCandidate.invoiceNumber?.value || '',
        date: domainCandidate.invoiceDate?.value
          ? domainCandidate.invoiceDate.value.toISOString()
          : new Date().toISOString(),
      },
      metadata: {
        gstin: extractedData.gstin || null,
        pan: extractedData.pan || null,
        state: extractedData.state || null,
        placeOfSupply: extractedData.placeOfSupply || null,
        purchaseOrder: extractedData.purchaseOrder || null,
        paymentTerms: extractedData.paymentTerms || null,
        taxes: {
          cgst: extractedData.cgst || null,
          sgst: extractedData.sgst || null,
          igst: extractedData.igst || null,
          cess: extractedData.cess || null,
        },
        lineItems: lineItems.map((item: any) => ({
          description: item.description || null,
          hsnSac: item.hsnSac || null,
          quantity: item.quantity || null,
          unit: item.unit || null,
          rate: item.rate || null,
          amount: item.amount || null,
          taxPercent: item.taxPercent || null,
          taxAmount: item.taxAmount || null,
        })),
        ledgerDecisions,
      },
    };
  }
}
