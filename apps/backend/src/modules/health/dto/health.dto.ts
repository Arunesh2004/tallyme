export class HealthResponseDto {
  status!: 'ok' | 'error' | 'shutting_down';
  info!: Record<string, any>;
  error!: Record<string, any>;
  details!: Record<string, any>;
  timestamp!: string;
}
