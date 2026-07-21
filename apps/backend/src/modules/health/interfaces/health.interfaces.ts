export interface HealthCheckResult {
  status: 'ok' | 'error' | 'shutting_down';
  info: Record<string, HealthIndicatorResult>;
  error: Record<string, HealthIndicatorResult>;
  details: Record<string, HealthIndicatorResult>;
}

export interface HealthIndicatorResult {
  status: 'up' | 'down';
  message?: string;
  [key: string]: any;
}
