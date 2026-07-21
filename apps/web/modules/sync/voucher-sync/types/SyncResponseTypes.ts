export enum SyncResultClassification {
  SUCCESS = 'SUCCESS',
  TEMPORARY_FAILURE = 'TEMPORARY_FAILURE',
  VALIDATION_FAILURE = 'VALIDATION_FAILURE',
  AUTH_FAILURE = 'AUTH_FAILURE',
  CONFLICT = 'CONFLICT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export interface NormalizedSyncResponse {
  classification: SyncResultClassification;
  rawResponse?: any;
  errorMessage?: string;
  durationMs: number;
}
