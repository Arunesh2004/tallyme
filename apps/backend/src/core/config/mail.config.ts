import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GMAIL_REDIRECT_URI,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  },
  storage: {
    path: process.env.MAIL_STORAGE_PATH || './storage/attachments',
  },
  pollIntervalMs: parseInt(process.env.MAIL_POLL_INTERVAL_MS || '60000', 10),
}));
