import { env } from '../../config/env';

export interface TallyConfig {
  host: string;
  port: number;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  keepAlive: boolean;
}

// In a real environment, these would be read from env vars or DB
// For MVP, we provide sensible defaults mapping to standard Tally Prime configuration.
export const defaultConfig: TallyConfig = {
  host: process.env.TALLY_HOST || '127.0.0.1',
  port: parseInt(process.env.TALLY_PORT || '9000', 10),
  timeout: parseInt(process.env.TALLY_TIMEOUT || '30000', 10), // 30s
  retryCount: parseInt(process.env.TALLY_RETRY_COUNT || '3', 10),
  retryDelay: parseInt(process.env.TALLY_RETRY_DELAY || '1000', 10),
  keepAlive: true,
};
