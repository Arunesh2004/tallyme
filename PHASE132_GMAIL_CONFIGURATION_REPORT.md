# Phase 132 Gmail Configuration Report

## 1. Authentication Flow
The system utilizes standard IMAP (via the `imapflow` package) rather than Google Pub/Sub Webhooks for email retrieval. The `GmailClientService` authenticates via simple username and password (requiring a Google App Password).

## 2. Background Polling Mechanism
The `GmailWatchService` implements an interval-based polling mechanism (`setInterval`). By default, it queries the `INBOX` every 60 seconds (`mail.pollIntervalMs`) for emails lacking the `\Seen` flag. Processed emails are marked as read.

## 3. Environment Variables
### Required Variables
To enable the student payment pipeline, the following variables must be added to `.env`:

```env
GMAIL_ADDRESS=your-test-school-inbox@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
IMAP_HOST=imap.gmail.com   # Optional, defaults to imap.gmail.com
IMAP_PORT=993              # Optional, defaults to 993
MAIL_POLL_INTERVAL_MS=60000 # Optional, defaults to 60000
```

### Current Missing Configuration
- **BLOCKED**: `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` are completely missing from the `.env` file. The polling worker correctly aborts startup if these are absent.

## 4. Connection Checklist
1. Create a dedicated test Gmail account (e.g., `tallyme.uat.school@gmail.com`).
2. Enable 2-Step Verification on the Google Account.
3. Generate an "App Password" (16 characters) for Mail.
4. Update `.env` with `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD`.
5. Restart the backend worker.
