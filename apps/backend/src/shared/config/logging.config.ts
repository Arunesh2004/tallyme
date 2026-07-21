import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  prettyPrint: boolean;
  requestLogging: boolean;
}

export const loggingConfig = registerAs('logging', (): LoggingConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    level: env.LOG_LEVEL,
    prettyPrint: env.LOG_PRETTY_PRINT,
    requestLogging: env.LOG_REQUEST_LOGGING
  };
});
