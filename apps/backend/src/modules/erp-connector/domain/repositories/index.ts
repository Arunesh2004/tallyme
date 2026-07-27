import {
  ITransactionContext,
  Page,
  PageRequest,
} from '../../../../shared/domain/repositories';

// (implementation note)
export type ERPSyncJob = { id: string };

export interface IERPSyncJobRepository {
  registerSyncAttempt(job: ERPSyncJob, tx?: ITransactionContext): Promise<void>;
  updateSyncStatus(
    jobId: string,
    status: string,
    tx: ITransactionContext,
  ): Promise<void>;
  findFailedJobsForRetry(page: PageRequest): Promise<Page<ERPSyncJob>>;
}
