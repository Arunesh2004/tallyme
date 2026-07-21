import { TallyClient } from '../../../../shared/tally/TallyClient';
import { BaseTallyRepository } from '../../shared/repositories/BaseTallyRepository';
import { MasterResult } from '../types/MasterResult';
import { MasterType, TallyMasterNodeMap, TallyAccountTypeMap } from '../entities/MasterType';

export class TallyMasterRepository extends BaseTallyRepository {
  constructor(tallyClient: TallyClient) {
    super(tallyClient);
  }

  public async saveMaster(xmlPayload: string): Promise<MasterResult> {
    return this.sendXmlPayload(xmlPayload, 'Master successfully created in Tally Prime.');
  }

  public async readMasters(masterType: MasterType): Promise<MasterResult> {
    try {
      const accountType = TallyAccountTypeMap[masterType];
      const nodeName = TallyMasterNodeMap[masterType];

      if (!accountType || !nodeName) {
         return {
           success: false,
           message: `Unsupported master type for reading: ${masterType}`
         };
      }

      const data = await this.tallyClient.readMasters(accountType, nodeName);
      return {
        success: true,
        message: 'Successfully retrieved masters.',
        data
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to retrieve masters from Tally Prime.',
        errors: [error.message]
      };
    }
  }
}
