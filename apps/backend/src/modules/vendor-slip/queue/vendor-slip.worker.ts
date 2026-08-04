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
import {
  InvoiceCandidate,
  VendorMatch,
  ExpenseAllocation,
  LedgerMapping,
} from '../domain/entities';
import { TransactionDraftService } from '../../universal-transaction/services/transaction-draft.service';
import { VendorSlipDraftAdapter } from '../application/vendor-slip-draft.adapter';
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
import {
  AccountingTransaction,
  TransactionType,
} from '../../../shared/domain/accounting-transaction';
import { AccountingIntelligenceService } from '../../accounting-intelligence/workflows/accounting-intelligence.service';
import { ValidationStatus } from '../../../shared/domain/extraction-confidence';
import { VmmsShadowExecutionService } from '../vmms/application/vmms-shadow-execution.service';
import { VmmsActiveExecutionService } from '../vmms/application/vmms-active-execution.service';
import { VmmsFeatureFlagService } from '../vmms/config/vmms-feature-flag.service';

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
    private readonly accountingIntelligence: AccountingIntelligenceService,
    @Inject(QUEUE_PROVIDER) private readonly queueService: IQueueService,
    private readonly vmmsShadowExecutionService: VmmsShadowExecutionService,
    private readonly vmmsActiveExecutionService: VmmsActiveExecutionService,
    private readonly vmmsFeatureFlags: VmmsFeatureFlagService,
    private readonly transactionDraftService: TransactionDraftService,
    private readonly adapter: VendorSlipDraftAdapter,
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
      const subtotalAmt = (prismaCandidate.subtotal as any) || 0;

      const extractedData: any = prismaCandidate.extractedData || {};
      const confidence = extractedData.confidence || 0;
      // Normalizing to 0-100 scale for domain objects if API returned 0-1
      const normalizedConfidence =
        confidence <= 1 ? confidence * 100 : confidence;

      // Phase 10.3 AI HUMAN REVIEW QUEUE
      if (normalizedConfidence < 80) {
        await this.prisma.documentReviewQueue.create({
          data: {
            documentId: prismaCandidate.documentId,
            confidenceScore: normalizedConfidence,
            extractedData: extractedData as any,
            status: 'PENDING',
          },
        });
        await this.prisma.invoiceCandidate.update({
          where: { id: candidateId },
          data: { status: 'MANUAL_REVIEW_REQUIRED' },
        });
        this.logger.warn(`Confidence ${normalizedConfidence} < 80. Diverting to DocumentReviewQueue.`, 'VendorSlipWorker');
        return { status: 'MANUAL_REVIEW', reason: 'Low AI confidence score' };
      }


      const domainCandidate = new InvoiceCandidate(
        prismaCandidate.id,
        prismaCandidate.documentId,
        new ExtractedVendorName(
          prismaCandidate.extractedName || '',
          normalizedConfidence,
          prismaCandidate.extractedName || '',
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
        new ExtractedSubtotal(
          subtotalAmt,
          normalizedConfidence,
          subtotalAmt.toString(),
        ),
        new ExtractedTax(
          (prismaCandidate.tax as any) || 0,
          normalizedConfidence,
          (prismaCandidate.tax || 0).toString(),
        ),
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

      const extractedGstin = domainCandidate.extractedGstin?.value;

      // Attach raw extractedData for Accounting Intelligence to use
      (domainCandidate as any).extractedData = extractedData;

      let vendorLedgerName: string | undefined = undefined;
      let vendorId: string | undefined = undefined;
      const confidenceForVoucher = normalizedConfidence;
      let mapping: any;

      if (this.vmmsFeatureFlags.isVmmsActiveEnforcementEnabled()) {
        const vmmsResult = await this.vmmsActiveExecutionService.executeSync(
          candidateId,
          companyId,
          extractedGstin,
        );

        if (
          vmmsResult.requiresManualReview ||
          !vmmsResult.selectedVendorLedgerId
        ) {
          this.logger.warn(
            `VMMS Active Enforcement: requires manual review`,
            'VendorSlipWorker',
          );
          await this.prisma.invoiceCandidate.update({
            where: { id: candidateId },
            data: { status: 'MANUAL_REVIEW_REQUIRED' },
          });
          return {
            status: 'MANUAL_REVIEW',
            reason: 'VMMS requires manual review',
          };
        }

        // Active enforcement bypasses Legacy Ledger Mapping completely.
        vendorLedgerName = vmmsResult.selectedVendorLedgerName;

        if (!vendorLedgerName) {
          await this.prisma.invoiceCandidate.update({
            where: { id: candidateId },
            data: { status: 'MANUAL_REVIEW_REQUIRED' },
          });
          return {
            status: 'MANUAL_REVIEW',
            reason: 'VMMS ledger name missing',
          };
        }
      } else {
        // Phase B fallback: Legacy Matcher + Shadow Execution
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
        vendorId = match.vendorId;

        void this.vmmsShadowExecutionService
          .executeAsync(candidateId, companyId, extractedGstin)
          .catch((err) => {
            this.logger.error(
              `Unhandled VMMS error escaped shadow executor: ${err.message}`,
              err.stack,
              'VendorSlipWorker',
            );
          });

        const validationResult = this.validator.validate(
          domainCandidate,
          match,
        );
        if (
          validationResult.isFailure &&
          prismaCandidate.status !== 'APPROVED'
        ) {
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

        mapping = await this.ledgerMapper.map(match);
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
        vendorLedgerName = mapping.defaultLedgerCode;
      }

      // Phase 17B/F: Accounting Intelligence Integration
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

      // We resolve accounting payload via AccountingIntelligenceService orchestrator
      const genericPayload =
        await this.accountingIntelligence.generateVoucherPayload({
          candidateId,
          companyId,
          batchSyncItemId,
          domainCandidate,
          vendorLedgerName: vendorLedgerName!,
          vendorId,
          normalizedConfidence,
        });

      const canonicalPayload = this.adapter.map(genericPayload);

      try {
        await this.transactionDraftService.createDraft(canonicalPayload, 'system');
        
        await this.prisma.invoiceCandidate.update({
          where: { id: candidateId },
          data: { status: 'QUEUED' },
        });

        this.logger.log(
          `Successfully created Transaction Draft for candidate ${candidateId}`,
          'VendorSlipWorker',
        );
        
        return { status: 'QUEUED' };
      } catch (e: any) {
        if (e.name === 'DuplicateDetectedException' || e.message?.includes('DuplicateDetectedException')) {
          await this.prisma.invoiceCandidate.update({
            where: { id: candidateId },
            data: { status: 'FAILED' },
          });
          this.logger.warn(`Candidate ${candidateId} rejected as duplicate.`, 'VendorSlipWorker');
          return { status: 'FAILED' };
        } else {
          throw e;
        }
      }
    } catch (err: any) {
      this.logger.error(err.message, err.stack, 'VendorSlipWorker');
      throw err;
    }
  }
}
