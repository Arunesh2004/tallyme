import { TallyClient } from '../../../../shared/tally/TallyClient';
import { BaseTallyRepository } from '../../shared/repositories/BaseTallyRepository';
import { LedgerResult } from '../types/LedgerResult';

export class TallyLedgerRepository extends BaseTallyRepository {
  constructor(tallyClient: TallyClient) {
    super(tallyClient);
  }

  public async saveLedger(xmlPayload: string): Promise<LedgerResult> {
    return this.sendXmlPayload(xmlPayload, 'Ledger successfully created in Tally Prime.');
  }
}
