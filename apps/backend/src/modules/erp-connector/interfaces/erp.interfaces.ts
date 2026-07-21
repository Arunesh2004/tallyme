import { TallyVoucherDTO } from '../dto/tally-voucher.dto';
import { ERPRequestContext, TransportResult } from '../dto/transport.dto';
import { ERPResponse } from '../dto/response.dto';

export interface IERPRepository {
  createSyncJob(data: any): Promise<any>;
  findConnectionByAdapter(adapterCode: string): Promise<any>;
  logAttempt(attempt: any): Promise<void>;
  updateJobStatus(jobId: string, status: string, result?: any): Promise<void>;
  logSyncEvent(log: any): Promise<void>;
  findJobByIdempotencyHash(hash: string): Promise<any>;
  findJobById(jobId: string): Promise<any>;
}

export interface IERPAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  buildPayload(voucherData: TallyVoucherDTO): any;
  sendVoucher(
    payload: any,
    context: ERPRequestContext,
  ): Promise<TransportResult>;
  parseResponse(response: TransportResult): ERPResponse;
  validateResponse(parsedResponse: ERPResponse): boolean;
  verifyVoucherExists(
    voucherNumber: string,
    context: ERPRequestContext,
  ): Promise<'EXISTS' | 'NOT_FOUND' | 'UNKNOWN'>;
}
