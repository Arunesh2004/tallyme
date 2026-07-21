import { IERPAdapter } from '../interfaces/erp.interfaces';

export abstract class BaseERPAdapter implements IERPAdapter {
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
  abstract buildPayload(voucherData: any): any;
  abstract sendVoucher(payload: any): Promise<any>;
  abstract parseResponse(response: any): any;
  abstract validateResponse(parsedResponse: any): boolean;
}
