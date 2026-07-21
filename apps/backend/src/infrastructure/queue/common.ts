// --- jobs/index.ts ---
export interface JobMetadata {
  jobId: string;
  attempt: number;
  queueName: string;
  createdAt: Date;
  scheduledAt?: Date;
  correlationId: string;
  tenantId: string;
  retryCount: number;
}

export interface JobEnvelope<TEvent = any> {
  metadata: JobMetadata;
  event: TEvent;
}

export interface JobSerializer {
  serialize(job: JobEnvelope): string;
  deserialize(raw: string): JobEnvelope;
}

// --- retry/index.ts ---
export interface BackoffStrategy {
  type: 'fixed' | 'exponential' | 'linear';
  delay: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoff: BackoffStrategy;
}

export interface RetryClassifier {
  isRetryable(error: any): boolean;
}

export class DefaultRetryClassifier implements RetryClassifier {
  isRetryable(error: any): boolean {
    // Do not retry validation or business rule exceptions
    if (
      error?.name === 'ValidationException' ||
      error?.name === 'BaseDomainException'
    ) {
      return false;
    }
    return true; // Retry infrastructure and unknown errors
  }
}
