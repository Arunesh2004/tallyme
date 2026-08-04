import { Logger } from '@nestjs/common';

export enum ErrorCategory {
  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
  AUTHENTICATION = 'AUTHENTICATION',
  CONFIGURATION = 'CONFIGURATION',
  VALIDATION = 'VALIDATION',
}

export function classifyError(error: any): ErrorCategory {
  const msg = (error?.message || '').toLowerCase();
  const status = error?.status || error?.response?.status;
  
  if (status === 401 || status === 403 || msg.includes('unauthenticated') || msg.includes('api_key') || msg.includes('forbidden')) {
    return ErrorCategory.AUTHENTICATION;
  }
  if (status === 400 || msg.includes('invalid') || msg.includes('bad request')) {
    return ErrorCategory.VALIDATION;
  }
  if (msg.includes('not configured') || msg.includes('missing endpoint')) {
    return ErrorCategory.CONFIGURATION;
  }
  // Transient failures
  if (
    status === 503 ||
    status === 429 ||
    status === 502 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('resource exhausted') ||
    msg.includes('deadline exceeded') ||
    msg.includes('rate limit')
  ) {
    return ErrorCategory.TRANSIENT;
  }
  
  return ErrorCategory.PERMANENT;
}

export async function withResilience<T>(
  operation: () => Promise<T>,
  providerName: string,
  operationName: string,
  prometheus?: any,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  const logger = new Logger('ResilienceWrapper');
  let attempt = 0;

  while (attempt <= maxRetries) {
    const startTime = Date.now();
    try {
      const result = await operation();
      const latency = Date.now() - startTime;
      
      if (attempt > 0) {
        logger.log(`[RESILIENCE] ${providerName} ${operationName} succeeded after ${attempt} retries. Latency: ${latency}ms`);
      }
      return result;
    } catch (error: any) {
      const latency = Date.now() - startTime;
      const category = classifyError(error);
      
      logger.error(`[RESILIENCE] ${providerName} ${operationName} failed on attempt ${attempt + 1}/${maxRetries + 1}. Category: ${category}. Latency: ${latency}ms. Error: ${error.message}`);
      
      if (category !== ErrorCategory.TRANSIENT || attempt >= maxRetries) {
        // Bubble up permanent errors or if retries exhausted
        error.isTransient = category === ErrorCategory.TRANSIENT;
        error.failureCategory = category;
        throw error;
      }
      
      attempt++;
      // Exponential backoff with jitter
      // 1st retry: 1000ms + (0-500ms)
      // 2nd retry: 2000ms + (0-1000ms)
      // 3rd retry: 4000ms + (0-2000ms)
      const backoff = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * (backoff / 2));
      const delay = backoff + jitter;
      
      logger.log(`[RESILIENCE] Backing off for ${delay}ms before retry ${attempt} for ${providerName}...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
