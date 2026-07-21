import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { IERPRepository } from '../interfaces/erp.interfaces';
import { ERP_REPOSITORY, ERP_SYNC_STATUS } from '../constants/erp.constants';
import { ERPConnectionManager } from '../services/connection.manager';
import { ERPRequestContext } from '../dto/transport.dto';

@Injectable()
export class VerifyERPSyncUseCase {
  private readonly MAX_VERIFICATION_ATTEMPTS = 3;

  constructor(
    @Inject(ERP_REPOSITORY) private readonly repository: IERPRepository,
    private readonly connectionManager: ERPConnectionManager,
    private readonly logger: LoggerService,
  ) {}

  async execute(jobId: string, attemptNumber: number): Promise<void> {
    const startTime = Date.now();

    this.logger.debug(
      { message: 'Starting ERP verification execution', jobId, attemptNumber },
      'VerifyERPSyncUseCase',
    );

    // 1. Load ERPSyncJob
    const job = await this.repository.findJobById(jobId);
    if (!job) {
      this.logger.error(`Job not found: ${jobId}`, '', 'VerifyERPSyncUseCase');
      return; // Abort
    }

    // 2. Validate state
    if (
      job.status !== ERP_SYNC_STATUS.UNKNOWN &&
      job.status !== ERP_SYNC_STATUS.VERIFYING
    ) {
      this.logger.warn(
        {
          message: 'Skipping job not in UNKNOWN or VERIFYING state',
          jobId,
          status: job.status,
        },
        'VerifyERPSyncUseCase',
      );
      return;
    }

    // 3. Enforce Verification Limit
    const currentVerificationAttempts = (job.verificationAttempts || 0) + 1;
    if (currentVerificationAttempts > this.MAX_VERIFICATION_ATTEMPTS) {
      this.logger.warn(
        {
          message: 'Verification limit exceeded, moving to MANUAL_REVIEW',
          jobId,
        },
        'VerifyERPSyncUseCase',
      );
      await this.transitionState(
        job.id,
        job.status,
        ERP_SYNC_STATUS.MANUAL_REVIEW,
        'Max verification attempts reached',
        { incrementVerification: true },
      );
      return;
    }

    // 4. Transition to VERIFYING
    await this.transitionState(
      job.id,
      job.status,
      ERP_SYNC_STATUS.VERIFYING,
      `Starting verification attempt ${currentVerificationAttempts}`,
      { incrementVerification: true },
    );

    // 5. Query ERP
    const { adapter } = await this.connectionManager.getConnectionAndAdapter(
      job.adapterCode,
    );

    const context: ERPRequestContext = {
      voucherId: job.voucherCandidateId,
      jobId: job.id,
      queueName: 'erp-verify-queue',
      attemptNumber,
    };

    let result: 'EXISTS' | 'NOT_FOUND' | 'UNKNOWN';
    try {
      result = await adapter.verifyVoucherExists(job.idempotencyHash, context);
    } catch (error: any) {
      this.logger.error(
        {
          message: 'Verification probe failed unexpectedly',
          jobId,
          error: error.message,
        },
        error.stack,
        'VerifyERPSyncUseCase',
      );
      result = 'UNKNOWN'; // Safe fallback
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      {
        message: 'Verification probe completed',
        jobId,
        voucherCandidateId: job.voucherCandidateId,
        verificationAttempt: currentVerificationAttempts,
        result,
        duration,
      },
      'VerifyERPSyncUseCase',
    );

    // 6. State Transition logic based on Verification Result
    if (result === 'EXISTS') {
      // The voucher made it successfully before the connection died.
      await this.transitionState(
        job.id,
        ERP_SYNC_STATUS.VERIFYING,
        ERP_SYNC_STATUS.SYNCED,
        'Voucher verified as existing in ERP',
      );
    } else if (result === 'NOT_FOUND') {
      // The voucher did not make it. Safe to retry.
      await this.transitionState(
        job.id,
        ERP_SYNC_STATUS.VERIFYING,
        ERP_SYNC_STATUS.RETRY_PENDING,
        'Voucher not found in ERP, queueing retry',
      );
    } else {
      // Still unknown (e.g., Tally is down or timed out during verification).
      // Transition back to UNKNOWN and throw to trigger BullMQ delay/retry.
      await this.transitionState(
        job.id,
        ERP_SYNC_STATUS.VERIFYING,
        ERP_SYNC_STATUS.UNKNOWN,
        'Verification probe inconclusive',
      );
      throw new Error('Verification inconclusive, triggering BullMQ delay');
    }
  }

  private async transitionState(
    jobId: string,
    fromState: string,
    toState: string,
    reason: string,
    options: any = {},
  ) {
    // We will enhance the repository to support incrementVerification
    await this.repository.updateJobStatus(jobId, toState, {
      ...options,
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
      'VerifyERPSyncUseCase',
    );
  }
}
