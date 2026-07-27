import { XMLParser } from 'fast-xml-parser';

export interface TallyResponse {
  success: boolean;
  status: string;
  created?: number;
  altered?: number;
  error?: string;
  rawResponse: string;
}

export class XmlResponseParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      trimValues: true,
      textNodeName: 'text'
    });
  }

  parse(xml: string): TallyResponse {
    const rawResponse = xml;
    if (!xml || xml.trim() === '') {
      return { success: false, status: 'FAILED', error: 'Empty response from Tally', rawResponse };
    }

    try {
      const parsed = this.parser.parse(xml);
      
      const envelope = parsed.ENVELOPE;
      if (!envelope) {
        return { success: false, status: 'FAILED', error: 'Invalid XML format: No ENVELOPE', rawResponse };
      }

      // 1. Check for standard errors
      if (envelope.ERROR || envelope.LINEERROR) {
        const errText = envelope.ERROR || envelope.LINEERROR;
        return { 
          success: false, 
          status: 'ERROR', 
          error: typeof errText === 'object' ? JSON.stringify(errText) : String(errText), 
          rawResponse 
        };
      }

      // 2. Check BODY/DATA for errors (sometimes nested)
      if (envelope.BODY?.DATA?.ERRORS) {
        return { 
          success: false, 
          status: 'ERROR', 
          error: JSON.stringify(envelope.BODY.DATA.ERRORS), 
          rawResponse 
        };
      }

      // 3. Check STATUS tag
      const status = envelope.STATUS;
      if (status !== undefined) {
        const isSuccess = Number(status) === 1;
        return {
          success: isSuccess,
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          created: envelope.CREATED ? Number(envelope.CREATED) : 0,
          altered: envelope.ALTERED ? Number(envelope.ALTERED) : 0,
          error: isSuccess ? undefined : 'Tally returned non-success STATUS',
          rawResponse
        };
      }

      // 4. Successful Data queries (e.g., Export Data)
      if (envelope.BODY?.DATA?.COLLECTION) {
         return {
           success: true,
           status: 'DATA',
           rawResponse
         }
      }

      return { success: false, status: 'UNKNOWN', error: 'Unrecognized Tally Response Format', rawResponse };
      
    } catch (err: any) {
      return { success: false, status: 'PARSE_ERROR', error: 'Failed to parse XML: ' + err.message, rawResponse };
    }
  }
}
