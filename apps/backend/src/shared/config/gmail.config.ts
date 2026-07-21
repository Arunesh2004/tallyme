import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  account: string;
}

export const gmailConfig = registerAs('gmail', (): GmailConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    account: env.GMAIL_ACCOUNT,
  };
});
