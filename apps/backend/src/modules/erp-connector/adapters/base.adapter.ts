import { IERPAdapter } from '../interfaces/erp.interfaces';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';
import { ERPRequestContext, TransportResult } from '../dto/transport.dto';
import { ERPResponse } from '../dto/response.dto';

export abstract class BaseERPAdapter implements IERPAdapter {
  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
  abstract buildPayload(voucherData: TallyVoucherDTO): any;
  abstract sendVoucher(
    payload: any,
    context: ERPRequestContext,
  ): Promise<TransportResult>;
  abstract parseResponse(response: TransportResult): ERPResponse;
  abstract validateResponse(parsedResponse: ERPResponse): boolean;
  abstract verifyVoucherExists(
    voucherNumber: string,
    context: ERPRequestContext,
  ): Promise<'EXISTS' | 'NOT_FOUND' | 'UNKNOWN'>;
}
