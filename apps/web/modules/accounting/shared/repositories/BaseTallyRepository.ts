import { TallyClient } from '../../../../shared/tally/TallyClient';
import { XmlParseError } from '../../../../shared/tally/TallyError';
import { TallyResult } from '../types/TallyResult';

export abstract class BaseTallyRepository {
  constructor(protected tallyClient: TallyClient) {}

  protected async sendXmlPayload(xmlPayload: string, successMessage: string): Promise<TallyResult> {
    try {
      // sendXml handles transport and parses the response to check for <LINEERROR> and STATUS
      const parsedResponse = await this.tallyClient.sendXml(xmlPayload);
      
      // If we reach here, Tally accepted the payload without LINEERRORs
      return {
        success: true,
        message: successMessage,
      };
    } catch (error: any) {
      // If Tally returns a line error, TallyClient throws an XmlParseError
      if (error instanceof XmlParseError) {
        return {
          success: false,
          message: 'Tally rejected the request.',
          errors: [error.message]
        };
      }

      // Transport or network errors
      return {
        success: false,
        message: 'Failed to communicate with Tally Prime.',
        errors: [error.message]
      };
    }
  }
}
