// xml/index.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class XMLBuilder {
  buildEnvelope(body: string): string {
    return `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY>${body}</BODY></ENVELOPE>`;
  }
}

@Injectable()
export class XMLParser {
  parseResponse(xmlString: string): any {
    // Basic stub. Real impl uses fast-xml-parser
    return { success: !xmlString.includes('<ERROR>') };
  }
}

// mapper/index.ts
@Injectable()
export class VoucherMapper {
  toXML(voucherCandidate: any): string {
    return `<IMPORTDATA><REQUESTDATA><TALLYMESSAGE><VOUCHER></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA>`;
  }
}

@Injectable()
export class ERPErrorMapper {
  static translateTallyError(rawError: string): string {
    return rawError || 'Unknown Tally Error';
  }
}
