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

@Injectable()
export class ProcessERPSyncUseCase {
  constructor(
    @Inject(ERP_REPOSITORY) private readonly repository: IERPRepository,
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepository: IVoucherCandidateRepository,
    private readonly engine: ERPConnectorEngine,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly logger: LoggerService,
  ) {}

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
    };

    let transportDuration = 0;

    try {
      // 5. Invoke ERP Sync Orchestrator
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
          error: error.message,
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
        errorMessage: error.message,
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
        error.message,
        { lastError: error.message },
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
  }
}
