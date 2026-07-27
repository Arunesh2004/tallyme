import { VoucherBuildResult } from '../../interfaces/voucher.interfaces';

export interface IVoucherStrategy {
  build(payload: any): Promise<VoucherBuildResult>;
}
