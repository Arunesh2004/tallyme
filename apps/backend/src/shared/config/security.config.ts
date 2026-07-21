import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiry: string;
  encryptionKey: string;
  corsOrigins: string;
}

export const securityConfig = registerAs('security', (): SecurityConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    jwtSecret: env.JWT_SECRET,
    jwtExpiry: env.JWT_EXPIRY,
    encryptionKey: env.ENCRYPTION_KEY,
    corsOrigins: env.CORS_ORIGINS
  };
});
