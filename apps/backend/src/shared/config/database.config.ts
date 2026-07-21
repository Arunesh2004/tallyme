import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface DatabaseConfig {
  url: string;
}

export const databaseConfig = registerAs('database', (): DatabaseConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    url: env.DATABASE_URL,
  };
});
