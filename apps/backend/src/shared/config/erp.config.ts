import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface ERPConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  companyName: string;
}

export const erpConfig = registerAs('erp', (): ERPConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    host: env.ERP_HOST,
    port: env.ERP_PORT,
    username: env.ERP_USERNAME,
    password: env.ERP_PASSWORD,
    companyName: env.ERP_COMPANY_NAME,
  };
});
