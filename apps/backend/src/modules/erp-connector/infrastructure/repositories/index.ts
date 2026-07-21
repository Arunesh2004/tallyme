import { Injectable } from '@nestjs/common';
import {
  PrismaService,
  TransactionClient,
} from '../../../../infrastructure/prisma';
import { IERPSyncJobRepository, ERPSyncJob } from '../../domain/repositories';
import {
  ITransactionContext,
  Page,
  PageRequest,
} from '../../../../shared/domain/repositories';
import { ERPSyncMapper } from '../../../../shared/infrastructure/mappers';
import { InfrastructureException } from '../../../../shared/exceptions/InfrastructureException';

@Injectable()
export class PrismaERPSyncJobRepository implements IERPSyncJobRepository {
  constructor(private readonly prisma: PrismaService) {}
  private getClient(tx?: ITransactionContext): any {
    return tx ? (tx as unknown as TransactionClient) : this.prisma.client;
  }

  async registerSyncAttempt(
    job: ERPSyncJob,
    tx?: ITransactionContext,
  ): Promise<void> {
    try {
      const data = ERPSyncMapper.toPersistence(job);
      await this.getClient(tx).erpSyncJob.create({ data });
    } catch (e) {
      throw new InfrastructureException('Database error', e);
    }
  }

  async updateSyncStatus(
    jobId: string,
    status: string,
    tx: ITransactionContext,
  ): Promise<void> {}
  async findFailedJobsForRetry(page: PageRequest): Promise<Page<ERPSyncJob>> {
    return { items: [], total: 0, page: 1, size: 10, totalPages: 0 };
  }
}
