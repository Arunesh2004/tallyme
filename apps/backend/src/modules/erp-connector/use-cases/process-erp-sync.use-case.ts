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

@Injectable()
export class ProcessERPSyncUseCase {
  constructor(
    @Inject(ERP_REPOSITORY) private readonly repository: IERPRepository,
    private readonly engine: ERPConnectorEngine,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly logger: LoggerService,
  ) {}

  async execute(voucherCandidateId: string): Promise<void> {
    this.logger.debug(
      `Starting ERP sync for voucher candidate ${voucherCandidateId}`,
      'ProcessERPSyncUseCase',
    );

    // MOCK: Fetch voucher candidate from repository
    const mockVoucherCandidate = {
      id: voucherCandidateId,
      voucherNumber: 'REC-123456',
      totalDebit: 8000,
      totalCredit: 8000,
      lines: [],
    };

    // Initialize Job in DB
    const job = await this.repository.createSyncJob({
      connectionId: 'mock_conn_id', // Mock relation
      voucherCandidateId,
      status: ERP_SYNC_STATUS.PENDING,
    });

    try {
      // Execute Sync via Tally Adapter
      const result = await this.engine.syncVoucher(
        mockVoucherCandidate,
        ERP_ADAPTERS.TALLY_PRIME_V1,
      );

      // Log Attempt
      await this.repository.logAttempt({
        jobId: job.id,
        payloadHash: 'hash123',
        requestPayload: { payload: result.payload },
        responsePayload: { response: result.response },
        requestTime: new Date(Date.now() - result.duration),
        responseTime: new Date(),
        durationMs: result.duration,
        success: result.success,
        errorMessage: result.errorMessage,
      });

      // Update Job Status
      await this.repository.updateJobStatus(job.id, result.status, result);

      this.logger.log(
        `Sync completed with status: ${result.status}`,
        'ProcessERPSyncUseCase',
      );
    } catch (error) {
      this.logger.warn(
        `Sync failed, evaluating retry for ${voucherCandidateId}`,
        'ProcessERPSyncUseCase',
      );

      // Update Job Status to RETRYING
      await this.repository.updateJobStatus(job.id, ERP_SYNC_STATUS.RETRYING);

      // Re-queue with delay (handled natively by BullMQ retry config on worker usually, but explicit here if custom)
      throw error; // Let BullMQ handle retry mechanism based on worker config
    }
  }
}
