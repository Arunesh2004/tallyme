import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import {
  VendorMatcher,
  ExpenseAllocator,
  LedgerMapper,
  ExpenseValidationPolicy,
} from '../domain/services';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TallyMasterIntelligenceService } from '../../erp-connector/services/tally-master-intelligence.service';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { Inject } from '@nestjs/common';
import { VOUCHER_BUILDER_QUEUE } from '../../voucher-builder/constants/voucher.constants';
import {
  InvoiceCandidate,
  VendorMatch,
  ExpenseAllocation,
  LedgerMapping,
} from '../domain/entities';
import {
  InvoiceNumber,
  InvoiceDate,
  InvoiceAmount,
  ConfidenceScore,
  ExtractedVendorName,
  ExtractedSubtotal,
  ExtractedTax,
  ExtractedGSTIN,
} from '../domain/value-objects';
import { Prisma } from '@prisma/client';
import { VendorIntelligenceService } from '../../accounting-intelligence/workflows/vendor-intelligence.service';
import { LedgerMappingEngine } from '../../accounting-intelligence/ledger-mapping/ledger-mapping.engine';
import { AccountingRulesEngine } from '../../accounting-intelligence/rules-engine/accounting-rules.engine';
import { AccountingDecisionAuditService } from '../../accounting-intelligence/decision-audit/accounting-decision-audit.service';
import {
  AccountingTransaction,
  TransactionType,
} from '../../../shared/domain/accounting-transaction';
import { ValidationStatus } from '../../../shared/domain/extraction-confidence';

@Processor('vendor-slip-queue')
export class VendorSlipWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly matcher: VendorMatcher,
    private readonly ledgerMapper: LedgerMapper,
    private readonly allocator: ExpenseAllocator,
    private readonly validator: ExpenseValidationPolicy,
    private readonly masterIntelligence: TallyMasterIntelligenceService,
    private readonly vendorIntelligence: VendorIntelligenceService,
    private readonly ledgerMappingEngine: LedgerMappingEngine,
    private readonly rulesEngine: AccountingRulesEngine,
    private readonly auditService: AccountingDecisionAuditService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      const { candidateId, companyId, batchSyncItemId } = job.data;
      this.logger.log(
        `Processing Vendor Slip Candidate: ${candidateId}`,
        'VendorSlipWorker',
      );

      const prismaCandidate = await this.prisma.invoiceCandidate.findUnique({
        where: { id: candidateId },
      });

      if (!prismaCandidate) {
        throw new Error(`InvoiceCandidate not found: ${candidateId}`);
      }

      // (implementation note)
      const amt = prismaCandidate.total as any;
      const subtotalAmt = prismaCandidate.subtotal as any || 0;

      const extractedData: any = prismaCandidate.extractedData || {};
      const confidence = extractedData.confidence || 0;
      // Normalizing to 0-100 scale for domain objects if API returned 0-1
      const normalizedConfidence = confidence <= 1 ? confidence * 100 : confidence;

      const domainCandidate = new InvoiceCandidate(
        prismaCandidate.id,
        prismaCandidate.documentId,
        new ExtractedVendorName(
          prismaCandidate.extractedName || '',
          normalizedConfidence,
          prismaCandidate.extractedName || ''
        ),
        new InvoiceNumber(
          prismaCandidate.invoiceNumber || '',
          normalizedConfidence,
          prismaCandidate.invoiceNumber || '',
        ),
        new InvoiceDate(
          prismaCandidate.date || new Date(),
          normalizedConfidence,
          prismaCandidate.date ? prismaCandidate.date.toISOString() : '',
        ),
        new ExtractedSubtotal(subtotalAmt, normalizedConfidence, subtotalAmt.toString()),
        new ExtractedTax(prismaCandidate.tax as any || 0, normalizedConfidence, (prismaCandidate.tax || 0).toString()),
        new InvoiceAmount(amt, normalizedConfidence, amt.toString()),
        prismaCandidate.extractedGstin
          ? new ExtractedGSTIN(
              prismaCandidate.extractedGstin,
              normalizedConfidence,
              prismaCandidate.extractedGstin,
            )
          : null,
        new ConfidenceScore(normalizedConfidence),
        'EXTRACTED',
      );

      const matchResult = await this.matcher.match(domainCandidate);
      if (matchResult.isFailure) {
        this.logger.warn(
          `Matching failed: ${matchResult.error}`,
          'VendorSlipWorker',
        );
        await this.prisma.invoiceCandidate.update({
          where: { id: candidateId },
          data: { status: 'MANUAL_REVIEW_REQUIRED' },
        });
        return { status: 'MANUAL_REVIEW', reason: matchResult.error };
      }
      const match = matchResult.value;

      const validationResult = this.validator.validate(domainCandidate, match);
      if (validationResult.isFailure && prismaCandidate.status !== 'APPROVED') {
        this.logger.warn(
          `Validation failed: ${validationResult.error}`,
          'VendorSlipWorker',
        );
        await this.prisma.invoiceCandidate.update({
          where: { id: candidateId },
          data: { status: 'MANUAL_REVIEW_REQUIRED' },
        });
        return { status: 'MANUAL_REVIEW', reason: validationResult.error };
      }

      const mapping = await this.ledgerMapper.map(match);
      if (!mapping || !mapping.defaultLedgerCode) {
        this.logger.warn(
          `Ledger mapping failed for vendor ${match.vendorId}`,
          'VendorSlipWorker',
        );
        await this.prisma.invoiceCandidate.update({
          where: { id: candidateId },
          data: { status: 'MANUAL_REVIEW_REQUIRED' },
        });
        return { status: 'MANUAL_REVIEW', reason: 'Missing ledger mapping' };
      }

      // Phase 17B: Accounting Intelligence Integration
      const vendorName =
        domainCandidate.extractedVendorName?.value || 'Acme Corp';

      // Step 1: Pre-Sync Validation (Vendor Resolution & Confidence Evaluation)
      const isApproved =
        await this.vendorIntelligence.preSyncValidation(candidateId);
      if (!isApproved) {
        await this.prisma.invoiceCandidate.update({
          where: { id: candidateId },
          data: { status: 'MANUAL_REVIEW_REQUIRED' },
        });
        return {
          status: 'MANUAL_REVIEW',
          reason: 'Failed intelligence pre-sync validation',
        };
      }

      // Step 2: Resolve Ledger via LedgerMappingEngine (removing hardcoded strings)
      const expenseLedgerDecision =
        await this.ledgerMappingEngine.resolveExpenseLedger(
          match.vendorId,
          'DEFAULT_CATEGORY',
        );
      if (expenseLedgerDecision.selectedLedger === 'UNKNOWN_LEDGER') {
        await this.prisma.invoiceCandidate.update({
          where: { id: candidateId },
          data: { status: 'MANUAL_REVIEW_REQUIRED' },
        });
        return { status: 'MANUAL_REVIEW', reason: 'Unresolved expense ledger' };
      }
      const expenseLedgerName = expenseLedgerDecision.selectedLedger;
      const vendorLedgerName = mapping.defaultLedgerCode;

      let gstLedgerName: string | undefined;
      if (domainCandidate.extractedTax && domainCandidate.extractedTax.value && domainCandidate.extractedTax.value.toNumber() > 0) {
        const gstLedgerDecision = await this.ledgerMappingEngine.resolveGstLedger('INPUT_GST');
        if (gstLedgerDecision.selectedLedger === 'UNKNOWN_LEDGER') {
          await this.prisma.invoiceCandidate.update({
            where: { id: candidateId },
            data: { status: 'MANUAL_REVIEW_REQUIRED' },
          });
          return { status: 'MANUAL_REVIEW', reason: 'Unresolved GST ledger' };
        }
        gstLedgerName = gstLedgerDecision.selectedLedger;
      }

      const allocation = this.allocator.allocate(domainCandidate, mapping, expenseLedgerName, gstLedgerName);

      // Step 3: Create Canonical AccountingTransaction
      const totalAmount =
        allocation.totalAllocated && allocation.totalAllocated.value
          ? allocation.totalAllocated.value.toNumber()
          : 0;

      const accTx = new AccountingTransaction(
        candidateId,
        companyId,
        TransactionType.PURCHASE,
        'VENDOR_SLIP',
        domainCandidate.invoiceDate?.value || new Date(),
        [{ id: match.vendorId, type: 'VENDOR', ledgerName: vendorLedgerName }],
        allocation.lineItems.map((l, idx) => ({
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

      // Step 4: Accounting Rules Engine Evaluation
      const ruleDecision = await this.rulesEngine.evaluate(accTx);
      if (ruleDecision.requiresApproval) {
        await this.prisma.invoiceCandidate.update({
          where: { id: candidateId },
          data: { status: 'MANUAL_REVIEW_REQUIRED' },
        });
        return { status: 'MANUAL_REVIEW', reason: ruleDecision.explanation };
      }

      // Step 5: Accounting Decision Log
      await this.auditService.logDecision({
        companyId,
        inputData: { candidateId, vendorName, amount: totalAmount },
        ledgerDecision: expenseLedgerDecision,
        appliedRules: ruleDecision.appliedRules,
        confidence: ruleDecision.confidence,
      });

      // Create Generic VoucherCandidate payload for the Shared Engine
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
              ? allocation.lineItems.map((l) => ({
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
      };

      await this.queueService.addJob(
        VOUCHER_BUILDER_QUEUE,
        'build-purchase-voucher',
        genericPayload,
      );
      await this.prisma.invoiceCandidate.update({
        where: { id: candidateId },
        data: { status: 'QUEUED' },
      });

      this.logger.log(
        `Successfully dispatched to Voucher Builder for candidate ${candidateId}`,
        'VendorSlipWorker',
      );
    } catch (err: any) {
      this.logger.error(err.message, err.stack, 'VendorSlipWorker');
      throw err;
    }
  }
}
