import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryDecision {
  shouldRetry: boolean;
  reason: string;
}

/**
 * ERPRetryService — Single source of truth for all retry decisions.
 *
 * Phase I.2: This service is now the ONLY place where retry eligibility
 * and backoff are computed. No duplicate logic should exist elsewhere.
 */
@Injectable()
export class ERPRetryService {
  /** Non-retryable transport error codes (set by ERPTransportException.code) */
  private static readonly NON_RETRYABLE_TRANSPORT_CODES = new Set([
    'VALIDATION_ERROR',
    'DUPLICATE_VOUCHER',
    'CONFIG_ERROR',
  ]);

  /** Non-retryable ERP response codes (set by TallyXmlParserService) */
  private static readonly NON_RETRYABLE_RESPONSE_CODES = new Set([
    'BUSINESS_ERROR', // Tally rejected — permanent, no retry
    'MALFORMED_XML', // Parser could not understand response
    'TRANSPORT_ERROR', // HTTP-level failure — handled separately
  ]);

  constructor(private readonly configService?: ConfigService) {}

  /**
   * Determines whether a thrown exception (transport/network error) is retryable.
   * Used in the catch block of ProcessERPSyncUseCase.
   */
  shouldRetry(error: any): RetryDecision {
    const code: string = error?.code ?? '';

    if (ERPRetryService.NON_RETRYABLE_TRANSPORT_CODES.has(code)) {
      return {
        shouldRetry: false,
        reason: `Non-retryable transport code: ${code}`,
      };
    }

    // AbortError (timeout) and network errors are retryable
    const isNetwork =
      error?.name === 'AbortError' ||
      code === 'TIMEOUT' ||
      code === 'ECONNREFUSED' ||
      code === 'CONNECTION_FAILED' ||
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT';

    if (isNetwork) {
      return {
        shouldRetry: true,
        reason: `Retryable network error: ${code || error?.name}`,
      };
    }

    // Default: retryable (conservative — better to retry than lose a voucher)
    return {
      shouldRetry: true,
      reason: 'Unknown error — defaulting to retryable',
    };
  }

  /**
   * Determines whether a parsed ERP response code allows retry.
   * Used after TallyXmlParserService returns a responseCode.
   */
  shouldRetryResponseCode(responseCode: string): RetryDecision {
    if (ERPRetryService.NON_RETRYABLE_RESPONSE_CODES.has(responseCode)) {
      return {
        shouldRetry: false,
        reason: `Non-retryable ERP response: ${responseCode}`,
      };
    }
    // EMPTY_RESPONSE, UNKNOWN → retryable
    return {
      shouldRetry: true,
      reason: `Retryable response code: ${responseCode}`,
    };
  }

  /**
   * Returns true when job has exhausted all allowed attempts.
   */
  isExhausted(attempts: number, maxAttempts: number): boolean {
    return attempts >= maxAttempts;
  }

  /**
   * Exponential backoff in milliseconds.
   * attempt=0 → 1 000 ms
   * attempt=1 → 2 000 ms
   * attempt=2 → 4 000 ms
   * ...
   * capped at 300 000 ms (5 minutes)
   */
  calculateBackoff(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 300_000);
  }

  /**
   * Returns the configured maximum retry attempts from env,
   * defaulting to 5 if not set.
   */
  getMaxAttempts(): number {
    const raw = this.configService?.get<string>('ERP_MAX_RETRY_ATTEMPTS');
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 5;
  }
}
