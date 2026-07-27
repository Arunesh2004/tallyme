import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  imap: {
    user: process.env.GMAIL_ADDRESS,
    pass: process.env.GMAIL_APP_PASSWORD,
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
  },
  storage: {
    path: process.env.MAIL_STORAGE_PATH || './storage/attachments',
  },
  pollIntervalMs: parseInt(process.env.MAIL_POLL_INTERVAL_MS || '60000', 10),
}));
