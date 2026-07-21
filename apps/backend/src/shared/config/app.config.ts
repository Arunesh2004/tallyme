import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface AppConfig {
  name: string;
  env: 'development' | 'production' | 'test';
  port: number;
  apiPrefix: string;
}

export const appConfig = registerAs('app', (): AppConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    name: env.APP_NAME,
    env: env.NODE_ENV,
    port: env.PORT,
    apiPrefix: env.API_PREFIX
  };
});
