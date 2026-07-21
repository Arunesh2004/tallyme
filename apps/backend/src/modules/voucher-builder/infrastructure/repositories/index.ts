// Voucher Builder
import { Injectable } from '@nestjs/common';
import {
  PrismaService,
  TransactionClient,
} from '../../../../infrastructure/prisma';
import {
  IVoucherCandidateRepository,
  VoucherCandidate,
} from '../../domain/repositories';
import { ITransactionContext } from '../../../../shared/domain/repositories';
import { VoucherMapper } from '../../../../shared/infrastructure/mappers';
import { InfrastructureException } from '../../../../shared/exceptions/InfrastructureException';

@Injectable()
export class PrismaVoucherCandidateRepository implements IVoucherCandidateRepository {
  constructor(private readonly prisma: PrismaService) {}
  private getClient(tx?: ITransactionContext): any {
    return tx ? (tx as unknown as TransactionClient) : this.prisma.client;
  }

  async saveBalancedVoucher(
    voucher: VoucherCandidate,
    tx: ITransactionContext,
  ): Promise<void> {
    try {
      const data = VoucherMapper.toPersistence(voucher);
      await this.getClient(tx).voucherCandidate.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (e: any) {
      if (e.code === 'P2002')
        throw new InfrastructureException('Duplicate voucher', e);
      throw new InfrastructureException('Database error', e);
    }
  }

  async findPendingERPSync(): Promise<VoucherCandidate[]> {
    return [];
  }
  async markVoucherAsSynced(
    id: string,
    erpRef: string,
    tx: ITransactionContext,
  ): Promise<void> {}
  async markVoucherAsFailed(
    id: string,
    reason: string,
    tx: ITransactionContext,
  ): Promise<void> {}
}
