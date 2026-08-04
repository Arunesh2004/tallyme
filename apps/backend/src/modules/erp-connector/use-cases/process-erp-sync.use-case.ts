import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { IERPRepository } from '../interfaces/erp.interfaces';
import {
  ERP_REPOSITORY,
  ERP_ADAPTERS,
  ERP_SYNC_STATUS,
} from '../constants/erp.constants';
import { ERPConnectorEngine } from '../services/connector.engine';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { ERPRequestContext } from '../dto/transport.dto';
import { ERPTransportException } from '../exceptions/erp-transport.exception';
import { ERPRetryService } from '../services/retry.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { PeriodLockedException } from '../../../shared/exceptions/PeriodLockedException';

import { IVoucherCandidateRepository } from '../interfaces/voucher.interfaces';
import { VOUCHER_REPOSITORY } from '../constants/erp.constants';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TallyMasterValidationEngine } from '../../accounting-intelligence/validation/tally-master-validation.engine';
import { ApprovalWorkflowEngine } from '../../accounting-intelligence/governance/approval-workflow.engine';
import {
  AccountingTransaction,
  TransactionType,
} from '../../../shared/domain/accounting-transaction';
import { AccountingDecisionAuditService } from '../../accounting-intelligence/decision-audit/accounting-decision-audit.service';
import { AuditService } from '../../audit/audit.service';
import { CorrelationContext } from '../../../shared/observability/context';
import { TallyMasterIntelligenceService } from '../services/tally-master-intelligence.service';
import { MasterGroupResolverService } from '../../accounting-intelligence/governance/master-group-resolver.service';

@Injectable()
export class ProcessERPSyncUseCase {
  constructor(
    @Inject(ERP_REPOSITORY) private readonly repository: IERPRepository,
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepository: IVoucherCandidateRepository,
    private readonly engine: ERPConnectorEngine,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
    private readonly tallyMasterValidationEngine: TallyMasterValidationEngine,
    private readonly approvalWorkflowEngine: ApprovalWorkflowEngine,
    private readonly auditService: AccountingDecisionAuditService,
    private readonly globalAuditService: AuditService,
    private readonly tallyMasterIntelligence: TallyMasterIntelligenceService,
    private readonly masterGroupResolver: MasterGroupResolverService,
    /** FIX 1: ERPRetryService is now injected — single source of retry truth */
    private readonly retryService: ERPRetryService,
    private readonly periodService: AccountingPeriodService,
  ) {}

  async createJob(
    voucherCandidateId: string,
    adapterCode = 'TALLY_PRIME_V1',
  ): Promise<any> {
    const idempotencyHash = require('crypto')
      .createHash('sha256')
      .update(voucherCandidateId)
      .digest('hex');
    try {
      return await this.repository.createSyncJob({
        voucherCandidateId,
        adapterCode,
        idempotencyHash,
        status: ERP_SYNC_STATUS.PENDING,
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        const existingJob =
          await this.repository.findJobByIdempotencyHash(idempotencyHash);
        if (
          existingJob &&
          (existingJob.status === ERP_SYNC_STATUS.FAILED_PERMANENT ||
            existingJob.status === ERP_SYNC_STATUS.MANUAL_REVIEW)
        ) {
          // Reset job for retry
          await this.repository.updateJobStatus(
            existingJob.id,
            ERP_SYNC_STATUS.PENDING,
            {
              reason: 'Retry requested - resetting status',
              statusFrom: existingJob.status,
            },
          );
          existingJob.status = ERP_SYNC_STATUS.PENDING;
          existingJob.attempts = 0; // reset attempts
        }
        return existingJob;
      }
      throw err;
    }
  }

  async execute(jobId: string, attemptNumber: number): Promise<void> {
    this.logger.debug(
      { message: `Starting ERP sync execution`, jobId, attemptNumber },
      'ProcessERPSyncUseCase',
    );

    // 1. Load ERPSyncJob
    const job = await this.repository.findJobById(jobId);
    if (!job) {
      this.logger.error(`Job not found: ${jobId}`, '', 'ProcessERPSyncUseCase');
      return; // Abort
    }

    // 2. Validate state & skip terminal states
    const terminalStates = [
      ERP_SYNC_STATUS.SYNCED,
      ERP_SYNC_STATUS.FAILED_PERMANENT,
      ERP_SYNC_STATUS.MANUAL_REVIEW,
      ERP_SYNC_STATUS.CANCELLED,
    ];

    if (terminalStates.includes(job.status)) {
      this.logger.warn(
        {
          message: 'Skipping job already in terminal state',
          jobId,
          status: job.status,
        },
        'ProcessERPSyncUseCase',
      );
      return;
    }

    if (
      job.status === ERP_SYNC_STATUS.UNKNOWN ||
      job.status === ERP_SYNC_STATUS.VERIFYING
    ) {
      this.logger.warn(
        {
          message: 'Skipping job in verification loop',
          jobId,
          status: job.status,
        },
        'ProcessERPSyncUseCase',
      );
      return;
    }

    // 3. Load VoucherCandidate
    const voucherCandidate = await this.voucherRepository.findById(
      job.voucherCandidateId,
    );
    if (!voucherCandidate) {
      this.logger.error(
        {
          message: 'VoucherCandidate not found',
          jobId,
          voucherCandidateId: job.voucherCandidateId,
        },
        '',
        'ProcessERPSyncUseCase',
      );
      await this.transitionState(
        job.id,
        job.status,
        ERP_SYNC_STATUS.FAILED_PERMANENT,
        'VoucherCandidate not found in repository',
      );
      return;
    }

    // PHASE 18: TALLY MASTER VALIDATION
    // Construct AccountingTransaction from VoucherCandidate for Validation
    const parties: any[] = [];
    const lines: any[] = [];
    const taxes: any[] = [];

    // We assume PrismaVoucherCandidateRepository fetched entries.
    // Wait, the repository might not fetch entries by default. Let's fetch it via Prisma to be sure.
    const fullVoucher = await this.prisma.voucherCandidate.findUnique({
      where: { id: job.voucherCandidateId },
      include: { entries: true },
    });

    if (fullVoucher) {
      let total = 0;
      fullVoucher.entries.forEach((e) => {
        if (e.isParty) {
          const partyType =
            fullVoucher.voucherType === 'Purchase' ? 'VENDOR' : 'STUDENT';
          parties.push({ id: e.id, type: partyType, ledgerName: e.ledgerName });
        } else {
          lines.push({
            id: e.id,
            ledgerName: e.ledgerName,
            amount: Number(e.amount),
            isDebit: e.isDebit,
          });
        }
        total += Number(e.amount);
      });

      const accTx = new AccountingTransaction(
        job.voucherCandidateId,
        fullVoucher.companyId || '',
        fullVoucher.voucherType as any,
        'ERP_SYNC',
        fullVoucher.date,
        parties,
        lines,
        taxes,
        total,
        { voucherNumber: fullVoucher.voucherNumber },
        [],
        'AUTO_APPROVED' as any,
      );

      // --- NEW LEDGER PREFLIGHT LOOP ---
      this.logger.log(
        {
          message: 'SYNC_PREFLIGHT_STARTED',
          voucherId: job.voucherCandidateId,
        },
        'ProcessERPSyncUseCase',
      );

      try {
        const isPurchase = accTx.transactionType === TransactionType.PURCHASE;
        const companyId = fullVoucher.companyId || undefined;

        const metadata = (fullVoucher.metadata as any) || {};
        const ledgerDecisions = metadata.ledgerDecisions || {};

        const getExtractionConfidence = (ledgerName: string) => {
          let conf = 0;
          if (ledgerDecisions.vendor?.name === ledgerName) {
            conf = ledgerDecisions.vendor.confidence || 0;
          }
          if (conf === 0 && ledgerDecisions.expense?.name === ledgerName) {
            conf = ledgerDecisions.expense.confidence || 0;
          }
          if (conf === 0 && ledgerDecisions.taxes) {
            const taxMatch = Object.values(ledgerDecisions.taxes).find(
              (t: any) => t.name === ledgerName,
            ) as any;
            if (taxMatch) conf = taxMatch.confidence || 0;
          }
          if (conf === 0 && ledgerDecisions.lineItems) {
            const match = ledgerDecisions.lineItems.find(
              (l: any) => l.finalLedger === ledgerName,
            );
            if (match) conf = match.confidence || 0;
          }
          // Default to 1.0 for manually mapped fallback ledgers like Miscellaneous Expenses
          if (conf === 0 && ledgerName === 'Miscellaneous Expenses') {
            conf = 1.0;
          }

          return conf > 1 ? conf / 100 : conf;
        };

        // Resolve and Ensure Parties
        for (const party of accTx.parties) {
          const resolution = this.masterGroupResolver.resolvePartyGroup(party);
          const extractionConf = getExtractionConfidence(party.ledgerName);

          if (extractionConf < 0.8 || resolution.confidence < 0.6) {
            throw new Error(
              `Insufficient confidence to create ledger '${party.ledgerName}'. OCR: ${extractionConf}, Resolution: ${resolution.confidence}`,
            );
          }
          await this.tallyMasterIntelligence.ensureLedger(
            party.ledgerName,
            resolution.parentGroup,
            companyId,
          );

          await this.auditService.logDecision({
            companyId: fullVoucher.companyId || undefined,
            inputData: {
              voucherId: job.voucherCandidateId,
              ledger: party.ledgerName,
            },
            appliedRules: [
              {
                rule: 'AUTO_CREATE_LEDGER',
                passed: true,
                reason: resolution.reason,
              },
            ],
            confidence: resolution.confidence,
            supportingEvidence: [`Parent Group: ${resolution.parentGroup}`],
          });
        }

        // Resolve and Ensure Lines
        for (const line of accTx.lineItems) {
          const resolution = this.masterGroupResolver.resolveExpenseGroup(
            line,
            isPurchase,
          );
          const extractionConf = getExtractionConfidence(line.ledgerName);

          if (extractionConf < 0.8 || resolution.confidence < 0.6) {
            throw new Error(
              `Insufficient confidence to create ledger '${line.ledgerName}'. OCR: ${extractionConf}, Resolution: ${resolution.confidence}`,
            );
          }
          await this.tallyMasterIntelligence.ensureLedger(
            line.ledgerName,
            resolution.parentGroup,
            companyId,
          );

          await this.auditService.logDecision({
            companyId: fullVoucher.companyId || undefined,
            inputData: {
              voucherId: job.voucherCandidateId,
              ledger: line.ledgerName,
            },
            appliedRules: [
              {
                rule: 'AUTO_CREATE_LEDGER',
                passed: true,
                reason: resolution.reason,
              },
            ],
            confidence: extractionConf,
            supportingEvidence: [`Parent Group: ${resolution.parentGroup}`],
          });
        }

        // Resolve and Ensure Taxes
        for (const tax of accTx.taxes) {
          const resolution = this.masterGroupResolver.resolveTaxGroup(tax);
          const extractionConf = getExtractionConfidence(tax.ledgerName);

          if (extractionConf < 0.8 || resolution.confidence < 0.6) {
            throw new Error(
              `Insufficient confidence to create ledger '${tax.ledgerName}'. OCR: ${extractionConf}, Resolution: ${resolution.confidence}`,
            );
          }
          await this.tallyMasterIntelligence.ensureLedger(
            tax.ledgerName,
            resolution.parentGroup,
            companyId,
          );

          await this.auditService.logDecision({
            companyId: fullVoucher.companyId || undefined,
            inputData: {
              voucherId: job.voucherCandidateId,
              ledger: tax.ledgerName,
            },
            appliedRules: [
              {
                rule: 'AUTO_CREATE_LEDGER',
                passed: true,
                reason: resolution.reason,
              },
            ],
            confidence: extractionConf,
            supportingEvidence: [`Parent Group: ${resolution.parentGroup}`],
          });
        }

        // Insert newly verified ledgers into DiscoveryLedger offline cache
        // We do this by getting the latest discovery report and upserting the ledgers
        const latestDiscovery =
          await this.prisma.tallyDiscoveryReport.findFirst({
            where: { companyId: fullVoucher.companyId || undefined },
            orderBy: { createdAt: 'desc' },
          });

        if (latestDiscovery) {
          const allNewLedgers = [
            ...accTx.parties.map((p) => p.ledgerName),
            ...accTx.lineItems.map((l) => l.ledgerName),
            ...accTx.taxes.map((t) => t.ledgerName),
          ];

          for (const ledgerName of allNewLedgers) {
            const existing = await this.prisma.discoveryLedger.findFirst({
              where: {
                tallyDiscoveryReportId: latestDiscovery.id,
                data: { path: ['name'], equals: ledgerName },
              },
            });
            if (!existing) {
              await this.prisma.discoveryLedger.create({
                data: {
                  tallyDiscoveryReportId: latestDiscovery.id,
                  data: { name: ledgerName, type: 'LEDGER' },
                },
              });
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(
          { message: 'SYNC_PREFLIGHT_FAILED', error: err.message },
          'ProcessERPSyncUseCase',
        );
        // If preflight fails (either Tally is down, or confidence is too low),
        // we just let it fall through to TallyMasterValidationEngine which will fail
        // it correctly and route to MANUAL_REVIEW.
      }
      // --- END NEW LEDGER PREFLIGHT LOOP ---

      this.logger.log(
        {
          message: 'SYNC_VALIDATION_STARTED',
          voucherId: job.voucherCandidateId,
        },
        'ProcessERPSyncUseCase',
      );

      const validationResult =
        await this.tallyMasterValidationEngine.validate(accTx);

      if (!validationResult.valid) {
        this.logger.warn(
          {
            message: 'SYNC_VALIDATION_FAILED',
            missingMasters: validationResult.missingMasters,
          },
          'ProcessERPSyncUseCase',
        );

        await this.prisma.voucherCandidate.update({
          where: { id: job.voucherCandidateId },
          data: { status: 'FAILED' as any },
        });

        // Create Approval Request
        for (const missing of validationResult.missingMasters) {
          await this.approvalWorkflowEngine.createApprovalRequest({
            companyId: fullVoucher.companyId || undefined,
            type: missing.type,
            entityId: missing.name,
            reason: 'Missing Master in Tally',
            requestedBy: 'SYSTEM_SYNC_VALIDATION',
          });
        }

        // Log Decision
        await this.auditService.logDecision({
          companyId: fullVoucher.companyId || undefined,
          inputData: { voucherId: job.voucherCandidateId },
          appliedRules: [{ rule: 'TALLY_MASTER_VALIDATION', passed: false }],
          confidence: 0,
          supportingEvidence: [JSON.stringify(validationResult)],
        });

        await this.transitionState(
          job.id,
          job.status,
          ERP_SYNC_STATUS.MANUAL_REVIEW,
          'Voucher rejected due to missing Tally Masters',
        );
        return;
      }
      this.logger.log(
        {
          message: 'SYNC_VALIDATION_PASSED',
          voucherId: job.voucherCandidateId,
        },
        'ProcessERPSyncUseCase',
      );
    }

    // 4. State Transition to SYNCING
    try {
      await this.transitionState(
        job.id,
        job.status,
        ERP_SYNC_STATUS.SYNCING,
        'Starting synchronization attempt',
        { incrementAttempt: true },
      );
    } catch (error: any) {
      if (error.name === 'ConcurrentMutationException') {
        this.logger.warn(
          { message: 'Concurrent worker race detected, skipping job', jobId },
          'ProcessERPSyncUseCase',
        );
        return; // Gracefully exit on conditional update failure
      }
      throw error;
    }

    const context: ERPRequestContext = {
      voucherId: job.voucherCandidateId,
      jobId: job.id,
      queueName: 'tally-sync',
      attemptNumber,
      companyId: fullVoucher?.companyId || undefined,
    };

    let transportDuration = 0;

    const verificationCriteria = {
      voucherNumber: fullVoucher?.voucherNumber,
      voucherType: fullVoucher?.voucherType,
      partyLedger: fullVoucher?.partyLedgerName || undefined,
      date: fullVoucher?.date,
    };

    try {
      // Validate Accounting Period before interacting with ERP
      const syncDate = fullVoucher?.date || new Date();
      if (fullVoucher?.companyId) {
        try {
          await this.periodService.validatePostingAllowed(fullVoucher.companyId, syncDate);
        } catch (err: any) {
          if (err instanceof PeriodLockedException || err.name === 'PeriodLockedException') {
            this.logger.warn(
              {
                message: 'Voucher sync blocked by period lock',
                voucherId: job.voucherCandidateId,
                error: err.message
              },
              'ProcessERPSyncUseCase'
            );
            await this.transitionState(
              job.id,
              ERP_SYNC_STATUS.SYNCING,
              ERP_SYNC_STATUS.FAILED_PERMANENT,
              `ERP Sync blocked: ${err.message}`,
              { lastResponse: err.message, transportStatus: 'BUSINESS_ERROR' }
            );
            return;
          }
          throw err;
        }
      }

      // PHASE 2: IDEMPOTENCY CHECK BEFORE SYNC
      const existenceCheck = await this.engine.verifyVoucherExists(
        verificationCriteria,
        job.adapterCode,
        context,
      );

      if (existenceCheck === 'EXISTS') {
        this.logger.log(
          {
            message: 'VOUCHER_ALREADY_EXISTS_IN_ERP',
            voucherId: job.voucherCandidateId,
          },
          'ProcessERPSyncUseCase',
        );
        await this.transitionState(
          job.id,
          ERP_SYNC_STATUS.SYNCING,
          ERP_SYNC_STATUS.SYNCED,
          'Voucher already exists in ERP (Idempotency check passed)',
          { erpReferenceId: fullVoucher?.voucherNumber },
        );
        return;
      }
      // 5. Invoke ERP Sync Orchestrator
      this.logger.log(
        { message: 'SYNC_SENT_TO_TALLY', voucherId: job.voucherCandidateId },
        'ProcessERPSyncUseCase',
      );

      const result = await this.engine.syncVoucher(
        voucherCandidate,
        job.adapterCode,
        context,
      );

      transportDuration =
        result.transportMetadata?.durationMs || result.durationMs;

      // Audit field extraction from TransportResult
      const xmlHash = result.transportMetadata?.xmlHash ?? job.idempotencyHash;
      const payloadSizeBytes = result.transportMetadata?.payloadSizeBytes ?? 0;

      // 5. Log Attempt Metadata
      await this.repository.logAttempt({
        jobId: job.id,
        payloadHash: xmlHash,
        payloadSize: payloadSizeBytes,
        responseType: result.responseType,
        parserWarnings: result.parserWarnings,
        requestTime: new Date(Date.now() - transportDuration),
        responseTime: new Date(),
        durationMs: transportDuration,
        success: result.success,
        errorMessage: result.success ? null : result.message,
      });

      // Shared audit data for both success and failure paths
      const sharedAuditData = {
        xmlHash,
        responseTimeMs: transportDuration,
        transportStatus: result.success ? 'SUCCESS' : result.responseType,
        parserWarnings: result.parserWarnings || [],
        lastResponse: result.message || null,
        retryCount: job.attempts || 0,
        requestXml: result.requestXml || null,
        responseXml: result.rawResponse || null,
      };

      // 6. Interpret ERPSyncResult
      if (result.success) {
        // Extract voucherNumber/masterId/guid from referenceId if available
        // referenceId format expected: "VCHNO:PUR-123|MASTERID:456|GUID:abc" or plain voucher number
        const refId = result.referenceId || '';
        const voucherNumber = refId.match(/VCHNO:([^|]+)/)?.[1] || refId || fullVoucher?.voucherNumber || null;
        const masterId = refId.match(/MASTERID:([^|]+)/)?.[1] || null;
        const guid = refId.match(/GUID:([^|]+)/)?.[1] || null;

        await this.transitionState(
          job.id,
          ERP_SYNC_STATUS.SYNCING,
          ERP_SYNC_STATUS.SYNCED,
          'Sync successful',
          {
            erpReferenceId: result.referenceId,
            voucherNumber,
            masterId,
            guid,
            ...sharedAuditData,
          },
        );
      } else {
        // Business failures are permanent unless dynamically resolvable
        const isUnknown =
          result.responseType === 'MALFORMED_XML' ||
          result.responseType === 'EMPTY_RESPONSE';

        // DYNAMIC MISSING MASTER ORCHESTRATION
        this.logger.warn({
          message: 'DEBUG_ERP_REJECTION',
          resultMessage: result.message,
          jobId: job.id
        }, 'ProcessERPSyncUseCase');

        // Extract ledger missing error from Tally: e.g. "Ledger 'Advertising on Indeed.com' does not exist!"
        const missingLedgerMatch = result.message?.match(/Ledger (?:'|&apos;|"|&quot;)(.+?)(?:'|&apos;|"|&quot;) does not exist/i);
        this.logger.warn({
          message: 'DEBUG_REGEX_MATCH',
          matched: !!missingLedgerMatch,
          captured: missingLedgerMatch?.[1]
        }, 'ProcessERPSyncUseCase');

        if (missingLedgerMatch && missingLedgerMatch[1]) {
          const missingLedgerName = missingLedgerMatch[1];
          this.logger.warn(
            { message: 'TALLY_MISSING_MASTER_DETECTED', missingLedgerName, jobId: job.id },
            'ProcessERPSyncUseCase',
          );

          let retryNeeded = false;
          try {
            // Find which group this ledger belongs to by searching the VoucherCandidate entries directly
            const isPurchase = (fullVoucher?.voucherType as string)?.toUpperCase() === 'PURCHASE';
            const companyId = fullVoucher?.companyId || undefined;
            let parentGroup = 'Suspense Accounts'; // Safe fallback
            
            if (fullVoucher?.entries) {
              const matchingEntry = fullVoucher.entries.find((e: any) => e.ledgerName.toLowerCase() === missingLedgerName.toLowerCase());
              if (matchingEntry) {
                if (matchingEntry.isParty) {
                  const partyType = isPurchase ? 'VENDOR' : 'STUDENT';
                  parentGroup = this.masterGroupResolver.resolvePartyGroup({ type: partyType } as any).parentGroup;
                } else if (matchingEntry.ledgerName.toLowerCase().includes('gst')) {
                  parentGroup = this.masterGroupResolver.resolveTaxGroup({ ledgerName: matchingEntry.ledgerName } as any).parentGroup;
                } else {
                  parentGroup = this.masterGroupResolver.resolveExpenseGroup({ ledgerName: matchingEntry.ledgerName } as any, isPurchase).parentGroup;
                }
              }
            }

            // Orchestrate creation
            await this.tallyMasterIntelligence.ensureLedger(missingLedgerName, parentGroup, companyId);
            
            this.logger.log(
              { message: 'MASTER_CREATED_RETRYING_SYNC', missingLedgerName, parentGroup, jobId: job.id },
              'ProcessERPSyncUseCase',
            );
            
            // Transition to FAILED_TEMPORARY which triggers normal worker retry logic
            await this.transitionState(
              job.id,
              ERP_SYNC_STATUS.SYNCING,
              ERP_SYNC_STATUS.FAILED_TEMPORARY,
              `Missing master '${missingLedgerName}' auto-created in Tally. Ready for retry.`,
              {
                lastError: result.message,
                missingMasterCreated: missingLedgerName,
                ...sharedAuditData,
              },
            );
            
            retryNeeded = true;
          } catch (recoveryErr: any) {
            this.logger.error(
              { message: 'FAILED_TO_CREATE_MISSING_MASTER', missingLedgerName, error: recoveryErr.message },
              'ProcessERPSyncUseCase',
            );
            // Fall through to permanent failure below
          }

          if (retryNeeded) {
            // Throw a retryable exception so BullMQ catches it and applies backoff
            throw new ERPTransportException(
              `Temporary business failure: Auto-created missing master '${missingLedgerName}'`,
              'TEMPORARY_BUSINESS_RECOVERY',
            );
          }
        }

        let newState = ERP_SYNC_STATUS.FAILED_PERMANENT;
        if (isUnknown) {
          newState = ERP_SYNC_STATUS.UNKNOWN;
        }

        await this.transitionState(
          job.id,
          ERP_SYNC_STATUS.SYNCING,
          newState,
          result.message || 'Unknown error',
          {
            lastError: result.message,
            ...sharedAuditData,
          },
        );
      }
    } catch (error: any) {
      // 7. Handle Transport and Unexpected Errors
      const isTransport = error instanceof ERPTransportException;
      const isTimeout = isTransport && error.code === 'TIMEOUT';

      this.logger.warn(
        {
          message: 'Sync failed with exception',
          jobId,
          error: (error as any).message,
          code: error.code,
        },
        'ProcessERPSyncUseCase',
      );

      // Log Failed Attempt
      await this.repository.logAttempt({
        jobId: job.id,
        payloadHash: job.idempotencyHash,
        payloadSize: 0,
        responseType: isTimeout ? 'TIMEOUT' : 'TRANSPORT_ERROR',
        parserWarnings: [],
        requestTime: new Date(Date.now() - transportDuration),
        responseTime: null,
        durationMs: transportDuration,
        success: false,
        errorMessage: (error as any).message,
      });

      // Audit data captured even on exception paths
      const exceptionAuditData = {
        transportStatus: isTimeout ? 'TIMEOUT' : (error.code || 'TRANSPORT_ERROR'),
        lastResponse: (error as any).message || null,
        responseTimeMs: transportDuration,
        retryCount: (job.attempts || 0) + 1,
        parserWarnings: [],
      };

      // Delegate retry decision to ERPRetryService
      const retryDecision = this.retryService.shouldRetry(error);
      const exhausted = this.retryService.isExhausted(
        job.attempts + 1,
        job.maxAttempts ?? this.retryService.getMaxAttempts(),
      );

      let nextState;
      if (isTimeout) {
        // PHASE 3: TIMEOUT RECOVERY
        this.logger.warn(
          {
            message:
              'Transport timeout, checking if voucher was created anyway',
            jobId,
          },
          'ProcessERPSyncUseCase',
        );
        const timeoutExistence = await this.engine.verifyVoucherExists(
          verificationCriteria,
          job.adapterCode,
          context,
        );

        if (timeoutExistence === 'EXISTS') {
          this.logger.log(
            {
              message: 'VOUCHER_ALREADY_EXISTS_IN_ERP_AFTER_TIMEOUT',
              voucherId: job.voucherCandidateId,
            },
            'ProcessERPSyncUseCase',
          );
          nextState = ERP_SYNC_STATUS.SYNCED;
          // On timeout-recovery-to-SYNCED, mark transportStatus as TIMEOUT_RECOVERED
          exceptionAuditData.transportStatus = 'TIMEOUT_RECOVERED';
        } else {
          nextState = ERP_SYNC_STATUS.FAILED_TEMPORARY;
        }
      } else if (!retryDecision.shouldRetry || exhausted) {
        // Non-retryable error or exhausted: route to MANUAL_REVIEW
        nextState = exhausted
          ? ERP_SYNC_STATUS.MANUAL_REVIEW
          : ERP_SYNC_STATUS.FAILED_PERMANENT;
      } else {
        // Recoverable network error — schedule retry
        nextState = ERP_SYNC_STATUS.FAILED_TEMPORARY;
      }

      this.logger.log(
        {
          message: 'Retry decision',
          jobId,
          retryDecision,
          exhausted,
          nextState,
        },
        'ProcessERPSyncUseCase',
      );

      await this.transitionState(
        job.id,
        ERP_SYNC_STATUS.SYNCING,
        nextState,
        (error as any).message,
        { lastError: (error as any).message, ...exceptionAuditData },
      );

      if (nextState === ERP_SYNC_STATUS.FAILED_TEMPORARY) {
        // Transition back to retry pending before throwing to BullMQ
        await this.transitionState(
          job.id,
          ERP_SYNC_STATUS.FAILED_TEMPORARY,
          ERP_SYNC_STATUS.RETRY_PENDING,
          'Queueing retry in BullMQ',
        );
        throw error; // Throwing triggers BullMQ's native backoff
      }
    }
  }

  private async transitionState(
    jobId: string,
    fromState: string,
    toState: string,
    reason: string,
    additionalData: any = {},
  ) {
    // Persist the state change with audit trail
    await this.repository.updateJobStatus(jobId, toState, {
      ...additionalData,
      reason,
      statusFrom: fromState,
    });

    this.logger.log(
      {
        message: 'Job state transition',
        jobId,
        previousState: fromState,
        newState: toState,
        reason,
      },
      'ProcessERPSyncUseCase',
    );

    // Update BatchSyncItem status if this transition involves a terminal state
    if (
      toState === ERP_SYNC_STATUS.SYNCED ||
      toState === ERP_SYNC_STATUS.FAILED_PERMANENT ||
      toState === ERP_SYNC_STATUS.CANCELLED ||
      toState === ERP_SYNC_STATUS.MANUAL_REVIEW
    ) {
      const job = await this.repository.findJobById(jobId);
      if (job) {
        // Phase 6: Lifecycle state synchronization
        const voucher = await this.prisma.voucherCandidate.findUnique({
          where: { id: job.voucherCandidateId },
          select: { metadata: true }
        });
        const draftId = (voucher?.metadata as any)?.invoiceCandidateId;
        if (draftId) {
          if (toState === ERP_SYNC_STATUS.SYNCED) {
            await this.prisma.transactionOutbox.create({
              data: {
                aggregateType: 'ERPSyncJob',
                aggregateId: job.id,
                eventType: 'ERP_SYNC_COMPLETED',
                payload: { draftId, jobId: job.id },
                status: 'PENDING'
              }
            });
            await this.globalAuditService.log({
              action: 'ERP_SYNC_COMPLETED',
              entity: 'ERPSyncJob',
              entityId: job.id,
              correlationId: CorrelationContext.getCorrelationId(),
              reason: 'Voucher successfully synchronized to ERP',
              newValue: { draftId, jobId: job.id },
            });
          } else {
            await this.prisma.transactionOutbox.create({
              data: {
                aggregateType: 'ERPSyncJob',
                aggregateId: job.id,
                eventType: 'ERP_SYNC_FAILED',
                payload: { draftId, jobId: job.id, reason },
                status: 'PENDING'
              }
            });
          }
        }

        const batchItems = await this.prisma.batchSyncItem.findMany({
          where: { voucherCandidateId: job.voucherCandidateId },
        });

        for (const item of batchItems) {
          const newStatus =
            toState === ERP_SYNC_STATUS.SYNCED ? 'SYNCED' : 'FAILED';
          await this.prisma.batchSyncItem.update({
            where: { id: item.id },
            data: { status: newStatus, error: reason, completedAt: new Date() },
          });

          // Recalculate BatchSyncJob
          const batchJob = await this.prisma.batchSyncJob.findUnique({
            where: { id: item.batchJobId },
            include: { items: true },
          });

          if (batchJob) {
            const syncedCount = batchJob.items.filter(
              (i) => i.status === 'SYNCED',
            ).length;
            const failedCount = batchJob.items.filter(
              (i) => i.status === 'FAILED',
            ).length;
            const isCompleted =
              syncedCount + failedCount === batchJob.totalItems;

            await this.prisma.batchSyncJob.update({
              where: { id: batchJob.id },
              data: {
                syncedItems: syncedCount,
                failedItems: failedCount,
                processingItems: batchJob.items.filter(
                  (i) =>
                    i.status === 'PROCESSING' ||
                    i.status === 'VOUCHER_CREATED' ||
                    i.status === 'ERP_SYNCING',
                ).length,
                status: isCompleted ? 'COMPLETED' : batchJob.status,
                completedAt: isCompleted ? new Date() : null,
              },
            });
          }
        }
      }
    }
  }
}
