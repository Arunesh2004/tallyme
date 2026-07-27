export interface ERPRequestContext {
  requestId?: string;
  correlationId?: string;
  voucherId: string;
  jobId?: string;
  queueName?: string;
  attemptNumber?: number;
  companyId?: string;
}

export interface TransportResult {
  rawResponse: string;
  httpStatus: number;
  durationMs: number;
  success: boolean;
  headers?: Record<string, string>;
}
