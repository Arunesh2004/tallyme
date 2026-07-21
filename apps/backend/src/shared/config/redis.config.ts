import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export const redisConfig = registerAs('redis', (): RedisConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  };
});
