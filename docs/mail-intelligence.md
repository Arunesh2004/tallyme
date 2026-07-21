# Mail Intelligence Subsystem

## Overview
The Mail Intelligence module is an independent bounded context responsible for securely connecting to organizational mailboxes, identifying financial documents (invoices, POs), extracting them, and handing them off to the Document Intelligence pipeline.

## Architectural Components

### Mailbox Abstraction & OAuth
- **Abstraction Layer:** A unified `IMailClient` interface abstracts Gmail API, Microsoft Graph API (Outlook), and generic IMAP protocols.
- **OAuth Token Lifecycle:** Tokens are encrypted at rest using AES-256-GCM and stored in the `MailboxCredentials` table. A dedicated background `TokenRefreshWorker` proactively refreshes expiring tokens to prevent sync interruptions.

### Ingestion Pipeline (Polling vs Push)
- **Gmail / Outlook:** Utilizes Webhooks (Push architecture) where supported. A generic `/api/webhooks/mail` endpoint receives push notifications, placing a `MailboxChanged` event on the queue.
- **IMAP:** Utilizes a scheduled `PollingWorker` (cron) for legacy providers.

### Parsing & Extraction
- **MIME Parsing:** Extracts raw headers (Message-ID, In-Reply-To), HTML body, and plaintext fallbacks.
- **Attachment Extraction:** Filters binary streams for supported MIME types (PDF, Excel, Images). Zip files are decompressed recursively (up to 2 levels) to prevent zip-bombing.
- **Thread Management:** Uses the `In-Reply-To` and `References` headers to group emails into conversations, ensuring follow-up emails (e.g., "Updated Invoice") are attached to the same root entity.

### Intelligence & Filtering
- **Duplicate Detection:** Computes a SHA-256 hash of the attachment and Message-ID. Hashed duplicates are marked as `IGNORED`.
- **Vendor Identification:** Simple heuristic matching (domain parsing) cross-referenced against the `Vendors` table before deeper AI extraction.
- **Spam/Irrelevant Filtering:** Basic NLP heuristics identify non-financial emails (e.g., newsletters) to save OCR costs.

## State Lifecycle
1. `UNPROCESSED`: Raw email ingested.
2. `PROCESSING`: MIME parsing and extraction in progress.
3. `FILTERED`: Identified as spam or non-financial.
4. `HANDED_OFF`: Valid attachment sent to Document Intelligence.
5. `FAILED`: Processing error (see Retry Strategy).

## Handoff to Document Intelligence
Once an attachment is deemed financially relevant, the Mail Intelligence module publishes a `DocumentUploaded` event onto the event bus. The payload contains an S3/Blob storage URI and the original `EmailId` for provenance. At this point, Mail Intelligence's responsibility ends.

## Resilience & Background Workers
- **Retry Strategy:** Transient failures (e.g., IMAP timeouts) trigger exponential backoff (up to 5 retries).
- **Dead Letter Queue (DLQ):** Persistent failures (e.g., corrupted MIME) move to the DLQ for manual IT review.
- **Events Emitted:** `MailReceived`, `MailProcessed`, `MailFailed`.

## Security Considerations
- OAuth scopes are strictly limited to `readonly` access.
- Attachments are scanned via ClamAV (or equivalent) stream buffers before landing in S3.
- All extracted PII is governed by organizational tenant boundaries.
