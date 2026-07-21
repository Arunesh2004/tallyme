import { ITransactionContext } from '../../../shared/domain/repositories';

// Stubs for Domain Entities
export type VoucherCandidate = { id: string };

export interface IVoucherCandidateRepository {
  saveBalancedVoucher(
    voucher: VoucherCandidate,
    tx: ITransactionContext,
  ): Promise<void>;
  findPendingERPSync(): Promise<VoucherCandidate[]>;
  markVoucherAsSynced(
    voucherId: string,
    erpReferenceId: string,
    tx: ITransactionContext,
  ): Promise<void>;
  markVoucherAsFailed(
    voucherId: string,
    reason: string,
    tx: ITransactionContext,
  ): Promise<void>;
}
