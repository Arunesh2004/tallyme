// contracts/index.ts
export interface ERPConfiguration {
  endpoint: string;
  timeoutMs: number;
}

export interface ERPRequest<T = any> {
  payload: T;
  correlationId: string;
}

export interface ERPResponse<T = any> {
  success: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: string;
}

export interface ERPHealth {
  status: 'UP' | 'DOWN';
  latencyMs: number;
  companyLoaded: boolean;
}

export interface ERPConnector {
  postVoucher(request: ERPRequest): Promise<ERPResponse>;
  updateVoucher(request: ERPRequest): Promise<ERPResponse>;
  deleteVoucher(voucherId: string): Promise<ERPResponse>;
  createLedger(request: ERPRequest): Promise<ERPResponse>;
  updateLedger(request: ERPRequest): Promise<ERPResponse>;
  fetchCompany(): Promise<ERPResponse>;
  pingERP(): Promise<ERPHealth>;
}
