import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true',
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  connectionTimeout: parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT || '30000',
    10,
  ),
  idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '10000', 10),
}));
