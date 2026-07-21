import { TallyClient } from '../../../../shared/tally/TallyClient';
import { VoucherResult } from '../types/VoucherResult';
import { BaseTallyRepository } from '../../shared/repositories/BaseTallyRepository';

export class TallyVoucherRepository extends BaseTallyRepository {
  constructor(tallyClient: TallyClient) {
    super(tallyClient);
  }

  public async saveVoucher(xmlPayload: string): Promise<VoucherResult> {
    return this.sendXmlPayload(xmlPayload, 'Voucher successfully created in Tally Prime.');
  }
}
