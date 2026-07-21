export interface ERPSyncResult {
  success: boolean;
  referenceId?: string;
  responseType: string;
  message?: string;
  parserWarnings: string[];
  transportMetadata?: {
    durationMs: number;
    httpStatus: number;
  };
  durationMs: number;
}
