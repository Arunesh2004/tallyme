# Phase 133 Gmail Setup Checklist

## 1. Required Environment Variables
The `.env` file must be updated with the following keys for the `GmailWatchService` to start polling:
```env
GMAIL_ADDRESS=tallyme.uat.school@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
MAIL_POLL_INTERVAL_MS=30000
```

## 2. Connection Verification Script
Create a quick script to verify IMAP connectivity without starting the entire application.

**File:** `check-gmail-imap.ts`
```typescript
import { ImapFlow } from 'imapflow';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: true,
    auth: {
      user: process.env.GMAIL_ADDRESS!,
      pass: process.env.GMAIL_APP_PASSWORD!
    },
    logger: false
  });

  try {
    console.log('Connecting to IMAP...');
    await client.connect();
    console.log('Successfully connected and authenticated!');
    const lock = await client.getMailboxLock('INBOX');
    console.log('Mailbox INBOX accessed successfully.');
    lock.release();
    await client.logout();
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}
check();
```
**Command:** `npx ts-node check-gmail-imap.ts`

## 3. Expected Successful Logs (Application Startup)
When starting the TallyMe backend, you should see:
```log
[GmailWatchService] Starting IMAP Mail Polling every 30000ms
[GmailWatchService] Found 0 unread emails.
```
If credentials are missing:
```log
[GmailWatchService] IMAP configuration missing. Mail polling aborted.
```
