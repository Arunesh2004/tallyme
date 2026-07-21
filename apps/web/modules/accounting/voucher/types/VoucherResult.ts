import { TallyResult } from '../../shared/types/TallyResult';

export interface VoucherResult extends TallyResult {
  voucherNumber?: string;
}
