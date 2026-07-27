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
          parties.push({ id: e.id, type: 'PARTY', ledgerName: e.ledgerName });
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

    try {
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

      // 5. Log Attempt Metadata
      await this.repository.logAttempt({
        jobId: job.id,
        payloadHash: job.idempotencyHash,
        payloadSize: 1024,
        responseType: result.responseType,
        parserWarnings: result.parserWarnings,
        requestTime: new Date(Date.now() - transportDuration),
        responseTime: new Date(),
        durationMs: transportDuration,
        success: result.success,
        errorMessage: result.success ? null : result.message,
      });

      // 6. Interpret ERPSyncResult
      if (result.success) {
        await this.transitionState(
          job.id,
          ERP_SYNC_STATUS.SYNCING,
          ERP_SYNC_STATUS.SYNCED,
          'Sync successful',
          { erpReferenceId: result.referenceId },
        );
      } else {
        // Business failures are permanent
        const isPermanent = result.responseType === 'BUSINESS_ERROR';
        // Truncated/Malformed indicates stream interruption or proxy mangling
        const isUnknown =
          result.responseType === 'MALFORMED_XML' ||
          result.responseType === 'EMPTY_RESPONSE';

        let newState = ERP_SYNC_STATUS.FAILED_PERMANENT;
        if (isUnknown) {
          newState = ERP_SYNC_STATUS.UNKNOWN;
        }

        await this.transitionState(
          job.id,
          ERP_SYNC_STATUS.SYNCING,
          newState,
          result.message || 'Unknown error',
          { lastError: result.message },
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
        payloadSize: 1024,
        responseType: isTimeout ? 'TIMEOUT' : 'TRANSPORT_ERROR',
        parserWarnings: [],
        requestTime: new Date(Date.now() - transportDuration),
        responseTime: null,
        durationMs: transportDuration,
        success: false,
        errorMessage: (error as any).message,
      });

      let nextState;
      if (isTimeout) {
        // Socket closed pre-ack: We don't know if Tally processed it.
        nextState = ERP_SYNC_STATUS.UNKNOWN;
      } else if (job.attempts + 1 >= job.maxAttempts) {
        // Max retries reached
        nextState = ERP_SYNC_STATUS.MANUAL_REVIEW;
      } else {
        // Recoverable network error (e.g. ECONNREFUSED)
        nextState = ERP_SYNC_STATUS.FAILED_TEMPORARY;
      }

      await this.transitionState(
        job.id,
        ERP_SYNC_STATUS.SYNCING,
        nextState,
        (error as any).message,
        { lastError: (error as any).message },
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
