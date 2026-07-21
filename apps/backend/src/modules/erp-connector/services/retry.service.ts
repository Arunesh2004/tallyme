import { Injectable } from '@nestjs/common';

@Injectable()
export class ERPRetryService {
  shouldRetry(error: any): boolean {
    // Only retry on network issues, timeouts, or specific 5xx errors
    // Do not retry on 4xx validation errors.
    const nonRetryableErrors = ['VALIDATION_ERROR', 'DUPLICATE_VOUCHER'];
    if (error.code && nonRetryableErrors.includes(error.code)) {
      return false;
    }
    return true; // Configurable based on error type
  }

  calculateBackoff(attempt: number): number {
    // Exponential backoff
    return Math.min(1000 * Math.pow(2, attempt), 300000); // max 5 min
  }
}
