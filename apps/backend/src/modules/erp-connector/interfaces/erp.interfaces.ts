export interface IERPRepository {
  createSyncJob(data: any): Promise<any>;
  findConnectionByAdapter(adapterCode: string): Promise<any>;
  logAttempt(attempt: any): Promise<void>;
  updateJobStatus(jobId: string, status: string, result?: any): Promise<void>;
  logSyncEvent(log: any): Promise<void>;
}

export interface IERPAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  buildPayload(voucherData: any): any;
  sendVoucher(payload: any): Promise<any>;
  parseResponse(response: any): any;
  validateResponse(parsedResponse: any): boolean;
}
