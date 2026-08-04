import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { VmmsVendorBranchRepository } from '../infrastructure/repositories/vmms-vendor-branch.repository';
import { VmmsVendorLedgerRepository } from '../infrastructure/repositories/vmms-vendor-ledger.repository';
import { VmmsReviewApproveDto } from '../api/dto/vmms-review.dto';
import { TransactionDraftService } from '../../../universal-transaction/services/transaction-draft.service';
import { VendorSlipDraftAdapter } from '../../application/vendor-slip-draft.adapter';
import { LedgerMappingEngine } from '../../../accounting-intelligence/ledger-mapping/ledger-mapping.engine';
import { ExpenseAllocator } from '../../domain/services';
import { AccountingRulesEngine } from '../../../accounting-intelligence/rules-engine/accounting-rules.engine';
import { AccountingDecisionAuditService } from '../../../accounting-intelligence/decision-audit/accounting-decision-audit.service';
import { InvoiceCandidate } from '../../domain/entities';
import {
  ExtractedVendorName,
  InvoiceNumber,
  InvoiceDate,
  ExtractedSubtotal,
  ExtractedTax,
  InvoiceAmount,
  ExtractedGSTIN,
} from '../../domain/value-objects';
import {
  AccountingTransaction,
  TransactionType,
} from '../../../../shared/domain/accounting-transaction';
import { ValidationStatus } from '../../../../shared/domain/extraction-confidence';
import { VmmsReviewRepository } from '../infrastructure/repositories/vmms-review.repository';

@Injectable()
export class VmmsReviewService {
  private readonly logger = new Logger(VmmsReviewService.name);

  constructor(
    private readonly reviewRepo: VmmsReviewRepository,
    private readonly branchRepo: VmmsVendorBranchRepository,
    private readonly ledgerRepo: VmmsVendorLedgerRepository,
    private readonly ledgerMappingEngine: LedgerMappingEngine,
    private readonly allocator: ExpenseAllocator,
    private readonly rulesEngine: AccountingRulesEngine,
    private readonly auditService: AccountingDecisionAuditService,
    private readonly draftService: TransactionDraftService,
    private readonly draftAdapter: VendorSlipDraftAdapter,
  ) {}

  async approve(dto: VmmsReviewApproveDto, reviewerId: string = 'system') {
    const { invoiceCandidateId, vendorBranchId, comment } = dto;

    const candidateRecord =
      await this.reviewRepo.getCandidateWithDocument(invoiceCandidateId);

    if (!candidateRecord) {
      throw new NotFoundException('Invoice candidate not found');
    }

    if (candidateRecord.status !== 'MANUAL_REVIEW_REQUIRED') {
      throw new BadRequestException(
        'Candidate is not in MANUAL_REVIEW_REQUIRED status',
      );
    }

    const branch = await this.branchRepo.findById(vendorBranchId);
    if (!branch || branch.companyId !== candidateRecord.document?.companyId) {
      throw new BadRequestException('Invalid vendor branch for this company');
    }

    const ledgers = await this.ledgerRepo.findByBranchId(vendorBranchId);
    if (!ledgers || ledgers.length === 0) {
      throw new BadRequestException('Vendor ledger not found');
    }
    const ledger = ledgers[0];
    const vendorLedgerId = ledger.id;
    const vendorLedgerName = ledger.erpLedgerCode;

    const matchEvidence = {
      timestamp: new Date().toISOString(),
      matchStage: 'MANUAL_OVERRIDE',
      matchedBy: reviewerId,
      confidence: 100,
      manualOverride: true,
      reasons: ['Manual review approval'],
      requiresManualReview: false,
      ledgerResolution: 'SINGLE_LEDGER',
      vendorBranchId,
      vendorLedgerId,
      executionMode: 'ENFORCED',
      overrideComment: comment,
    };

    await this.reviewRepo.saveApprovalDecision(
      invoiceCandidateId,
      candidateRecord.documentId,
      vendorBranchId,
      vendorLedgerId,
      reviewerId,
      comment,
      matchEvidence,
    );

    // 4. Enqueue natively
    // We must build the generic payload exactly like VendorSlipWorker does.
    const companyId = candidateRecord.document?.companyId || '';
    const batchSyncItemId = undefined;
    const extractedData: any = candidateRecord.extractedData || {};
    const confidence = extractedData.confidence || 0;
    const normalizedConfidence =
      confidence <= 1 ? confidence * 100 : confidence;

    const amt = candidateRecord.total as any;
    const subtotalAmt = (candidateRecord.subtotal as any) || 0;

    const domainCandidate = new InvoiceCandidate(
      candidateRecord.id,
      candidateRecord.documentId,
      new ExtractedVendorName(
        candidateRecord.extractedName || '',
        normalizedConfidence,
        candidateRecord.extractedName || '',
      ),
      new InvoiceNumber(
        candidateRecord.invoiceNumber || '',
        normalizedConfidence,
        candidateRecord.invoiceNumber || '',
      ),
      new InvoiceDate(
        candidateRecord.date || new Date(),
        normalizedConfidence,
        candidateRecord.date ? candidateRecord.date.toISOString() : '',
      ),
      new ExtractedSubtotal(
        subtotalAmt,
        normalizedConfidence,
        subtotalAmt.toString(),
      ),
      new ExtractedTax(
        (candidateRecord.tax as any) || 0,
        normalizedConfidence,
        (candidateRecord.tax || 0).toString(),
      ),
      new InvoiceAmount(amt, normalizedConfidence, amt.toString()),
      candidateRecord.extractedGstin
        ? new ExtractedGSTIN(
            candidateRecord.extractedGstin,
            normalizedConfidence,
            candidateRecord.extractedGstin,
          )
        : null,
      normalizedConfidence,
      candidateRecord.status as any,
    );

    const expenseLedgerDecision =
      await this.ledgerMappingEngine.resolveExpenseLedger(
        'UNKNOWN',
        'DEFAULT_CATEGORY',
      );
    const expenseLedgerName = expenseLedgerDecision.selectedLedger;

    let gstLedgerName: string | undefined;
    if (
      domainCandidate.extractedTax &&
      domainCandidate.extractedTax.value &&
      domainCandidate.extractedTax.value.toNumber() > 0
    ) {
      const gstLedgerDecision =
        await this.ledgerMappingEngine.resolveGstLedger('INPUT_GST');
      gstLedgerName = gstLedgerDecision.selectedLedger;
    }

    const allocation = {
      totalAllocated: domainCandidate.totalAmount,
      lineItems: [
        {
          ledger: expenseLedgerName,
          amount: domainCandidate.extractedSubtotal?.value || 0,
        },
      ],
    } as any;
    if (
      gstLedgerName &&
      domainCandidate.extractedTax &&
      domainCandidate.extractedTax.value &&
      domainCandidate.extractedTax.value.toNumber() > 0
    ) {
      allocation.lineItems.push({
        ledger: gstLedgerName,
        amount: domainCandidate.extractedTax.value.toNumber(),
      });
    }

    const totalAmount =
      allocation.totalAllocated && allocation.totalAllocated.value
        ? allocation.totalAllocated.value.toNumber()
        : 0;

    const accTx = new AccountingTransaction(
      invoiceCandidateId,
      companyId,
      TransactionType.PURCHASE,
      'VENDOR_SLIP',
      domainCandidate.invoiceDate?.value || new Date(),
      [{ id: 'VMMS', type: 'VENDOR', ledgerName: vendorLedgerName }],
      allocation.lineItems.map((l: any, idx: number) => ({
        id: `line-${idx + 1}`,
        ledgerName: l.ledger,
        amount: Number(l.amount),
        isDebit: true,
      })),
      [],
      totalAmount,
      { invoiceNumber: domainCandidate.invoiceNumber?.value },
      [],
      ValidationStatus.AUTO_APPROVED,
    );

    const ruleDecision = await this.rulesEngine.evaluate(accTx);

    await this.auditService.logDecision({
      companyId,
      inputData: {
        candidateId: invoiceCandidateId,
        vendorName: domainCandidate.extractedVendorName?.value || 'Acme Corp',
        amount: totalAmount,
      },
      ledgerDecision: expenseLedgerDecision,
      appliedRules: ruleDecision.appliedRules,
      confidence: ruleDecision.confidence,
    });

    const genericPayload = {
      voucherType: ruleDecision.voucherType,
      candidateId: domainCandidate.id,
      batchSyncItemId,
      companyId: companyId,
      allocation: {
        totalAmount: totalAmount,
        vendorLedger: vendorLedgerName,
        lines:
          allocation.lineItems.length > 0
            ? allocation.lineItems.map((l: any) => ({
                ledger: l.ledger,
                amount:
                  l.amount instanceof Object && 'toNumber' in l.amount
                    ? l.amount.toNumber()
                    : Number(l.amount),
              }))
            : [{ ledger: expenseLedgerName, amount: totalAmount }],
      },
      invoice: {
        number:
          domainCandidate.invoiceNumber && domainCandidate.invoiceNumber.value
            ? domainCandidate.invoiceNumber.value
            : '',
        date:
          domainCandidate.invoiceDate && domainCandidate.invoiceDate.value
            ? domainCandidate.invoiceDate.value.toISOString()
            : new Date().toISOString(),
      },
      metadata: {
        ledgerDecisions: {
          vendor: {
            name: vendorLedgerName,
            confidence: normalizedConfidence,
            source: 'VendorMatchingEngine',
          },
          expense: {
            name: expenseLedgerName,
            confidence: ruleDecision.confidence,
            source:
              expenseLedgerDecision.configurationSource ||
              'AccountingRulesEngine',
          },
          tax: gstLedgerName
            ? {
                name: gstLedgerName,
                confidence: ruleDecision.confidence,
                source: 'TaxResolutionEngine',
              }
            : undefined,
        },
      },
    };

    const canonicalModel = this.draftAdapter.map(genericPayload);

    // Create Draft (Wait in DRAFT status)
    await this.draftService.createDraft(canonicalModel, reviewerId);

    return {
      success: true,
      vendorMatchDecisionId: invoiceCandidateId,
      voucherEnqueued: true,
    };
  }
}
