export interface ConfigRetryLimits {
  erpSync: number;
  emailProcessing: number;
}

export interface ConfigMatchingThresholds {
  student: number;
  vendor: number;
}

export interface ConfigQueueLimits {
  maxActiveJobs: number;
  rateLimit: number;
}

export interface AdminConfiguration {
  ocrProvider: string;
  aiProvider: string;
  gmailIntegration: string;
  retryLimits: ConfigRetryLimits;
  matchingThresholds: ConfigMatchingThresholds;
  queueLimits: ConfigQueueLimits;
}

export interface AdminConfigurationUpdateResponse {
  message: string;
  updatedFields: string[];
}
