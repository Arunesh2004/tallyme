import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { VOUCHER_BUILDER_QUEUE } from '../constants/voucher.constants';
import { ProcessVoucherBuilderUseCase } from '../use-cases/process-voucher-builder.use-case';

@Processor(VOUCHER_BUILDER_QUEUE)
export class VoucherWorker extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly useCase: ProcessVoucherBuilderUseCase,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing voucher builder job ${job.id} for allocation ${job.data.feeAllocationCandidateId}`,
      'VoucherWorker',
    );

    try {
      await this.useCase.execute(job.data.feeAllocationCandidateId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Voucher building failed for allocation ${job.data.feeAllocationCandidateId}`,
        (error as Error).stack,
        'VoucherWorker',
      );
      throw error;
    }
  }
}
