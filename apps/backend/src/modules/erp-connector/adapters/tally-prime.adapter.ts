import { Injectable } from '@nestjs/common';
import { BaseERPAdapter } from './base.adapter';

@Injectable()
export class TallyPrimeAdapter extends BaseERPAdapter {
  async connect(): Promise<boolean> {
    // Mock connection
    return true;
  }

  async disconnect(): Promise<void> {
    // Mock disconnection
  }

  async healthCheck(): Promise<boolean> {
    // Mock Tally Server Health Check
    return true;
  }

  buildPayload(voucherData: any): string {
    // Mock XML Builder. In reality use xmlbuilder2 or similar.
    return `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDATA><TALLYMESSAGE><VOUCHER>Mock Tally XML for ${voucherData.voucherNumber}</VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendVoucher(payload: string): Promise<any> {
    // Mock Axios POST to Tally Server
    return {
      status: 200,
      data: '<RESPONSE><CREATED>1</CREATED><LASTVCHID>TALLY-999</LASTVCHID></RESPONSE>',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parseResponse(response: any): any {
    // Mock XML parser
    return {
      success: true,
      masterId: 'TALLY-999',
    };
  }

  validateResponse(parsedResponse: any): boolean {
    return parsedResponse && parsedResponse.success;
  }
}
