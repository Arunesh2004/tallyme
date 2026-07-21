import { XMLParser } from 'fast-xml-parser';
import { XmlParseError } from './TallyError';
import { logger } from '../logging/logger';

export class XmlParser {
  private static parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  static parseResponse(xmlString: string): any {
    try {
      const parsed = this.parser.parse(xmlString);
      
      // Check for generic Tally errors
      if (xmlString.includes('<LINEERROR>')) {
        let errorMsg = 'Unknown Tally Line Error';
        const match = xmlString.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
        if (match && match[1]) {
          errorMsg = match[1].trim();
        }
        throw new XmlParseError(`Tally returned a line error: ${errorMsg}`);
      }
      
      // Check for status failure
      const status = parsed?.ENVELOPE?.HEADER?.STATUS;
      if (status && status !== 1 && status !== '1') {
        throw new XmlParseError(`Tally response status was ${status}`);
      }

      logger.debug('XML parsed successfully.');
      return parsed; 
    } catch (error: any) {
      if (error instanceof XmlParseError) throw error;
      throw new XmlParseError(`XML Parsing failed: ${error.message}`);
    }
  }

  static parseCollection(xmlString: string, collectionKey: string): any[] {
    const parsed = this.parseResponse(xmlString);
    try {
      const dataNode = parsed?.ENVELOPE?.BODY?.DATA;
      
      // 1. Check for Collection format (e.g., Companies)
      if (dataNode && dataNode.COLLECTION && dataNode.COLLECTION[collectionKey]) {
        const data = dataNode.COLLECTION[collectionKey];
        return Array.isArray(data) ? data : [data];
      }

      // 2. Check for Master Data format (e.g., Ledgers, Voucher Types)
      // Tally returns Export Data via IMPORTDATA -> REQUESTDATA -> TALLYMESSAGE
      const requestDataNode = parsed?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA;
      if (requestDataNode && requestDataNode.TALLYMESSAGE) {
        const messages = Array.isArray(requestDataNode.TALLYMESSAGE) 
          ? requestDataNode.TALLYMESSAGE 
          : [requestDataNode.TALLYMESSAGE];
        
        const results: any[] = [];
        for (const msg of messages) {
          if (msg && msg[collectionKey]) {
            const items = Array.isArray(msg[collectionKey]) ? msg[collectionKey] : [msg[collectionKey]];
            results.push(...items);
          }
        }
        return results;
      }

      return [];
    } catch {
      return [];
    }
  }
}
