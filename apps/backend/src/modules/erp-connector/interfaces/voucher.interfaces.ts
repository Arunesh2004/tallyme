import { TallyVoucherDTO } from '../dto/tally-voucher.dto';

export interface IVoucherCandidateRepository {
  findById(id: string): Promise<TallyVoucherDTO | null>;
}
