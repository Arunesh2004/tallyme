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
  /** SHA-256 hash of the exact XML payload transmitted to Tally. */
  xmlHash?: string;
  /** UTF-8 byte length of the transmitted XML payload. */
  payloadSizeBytes?: number;
}
