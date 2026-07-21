# Background Workers Architecture

## Overview
The TallyMe backend is highly asynchronous. To decouple heavy I/O operations (like OCR, LLM extraction, and ERP synchronization) from the web layer, work is distributed across specialized Background Workers. This ensures high availability and fast API response times.

## Core Infrastructure
All workers are stateless and horizontally scalable. They consume messages from a durable message broker (e.g., RabbitMQ, Kafka) using consumer groups.
- **Queue Priorities:** High (Sync, Uploads), Medium (Mail Polling), Low (Scheduled Cleanup).
- **Graceful Shutdown:** Workers capture `SIGTERM` signals, finish their current `AIJob` or `SyncJob`, and safely exit without dropping messages.
- **Timeout Policy:** Every task type has a strict maximum execution time (e.g., OCR limits to 5 minutes) before the worker abandons the job to prevent hanging threads.

## Worker Definitions

### 1. Mail Worker
- **Purpose:** Parse raw `MailReceived` payloads, extract attachments, and deduplicate.
- **Input Queue:** `mail-ingestion-queue`
- **Consumed Events:** `MailReceived`
- **Published Events:** `DocumentUploaded`
- **Failure Recovery:** Transient IMAP errors retry with exponential backoff (max 5). Persistent parsing errors are routed to `mail-dlq`.

### 2. Document Intelligence Worker
- **Purpose:** Orchestrate OCR and AI extraction to create `BusinessDocuments`.
- **Input Queue:** `document-intelligence-queue`
- **Consumed Events:** `DocumentUploaded`
- **Published Events:** `BusinessDocumentCreated`
- **Concurrency Strategy:** High concurrency, CPU-bound. Requires specialized auto-scaling based on queue depth to manage LLM API rate limits.

### 3. Accounting Intelligence Worker
- **Purpose:** Apply Tally-specific mapping rules to generate a `VoucherDraft`.
- **Input Queue:** `accounting-intelligence-queue`
- **Consumed Events:** `BusinessDocumentCreated`
- **Published Events:** `VoucherDraftCreated`
- **Failure Recovery:** If the required vendor mappings do not exist in the DB, it does not retry. It completes the task and sets the Draft to `NEEDS_REVIEW`.

### 4. Tally Sync Worker
- **Purpose:** The exclusive conduit to Tally Prime. Converts `VoucherQueuedForSync` into XML and dispatches via HTTP.
- **Input Queue:** `tally-sync-queue`
- **Consumed Events:** `VoucherQueuedForSync`, `MasterSyncStarted`
- **Published Events:** `SyncSucceeded`, `SyncFailed`
- **Ordering Guarantee:** Strictly FIFO per `OrganizationId` to ensure dependent vouchers are synced in the correct ledger order.

### 5. Notification Worker
- **Purpose:** Dispatch emails and UI toasts for approvals and errors.
- **Input Queue:** `notification-queue`
- **Consumed Events:** `ApprovalRequested`, `SyncFailed`
- **Published Events:** `NotificationSent`

### 6. Scheduler & Cleanup Worker
- **Purpose:** Cron-based execution for garbage collection.
- **Lifecycle:** Deletes temporary S3 ingest objects older than 7 days, prunes the `EventOutbox` of successfully dispatched messages, and triggers token refreshes.

## Observability & Health
Workers expose a `/health` endpoint for Kubernetes liveness probes. They emit distributed tracing telemetry (OpenTelemetry) linking the `TraceId` across the event lifecycle (e.g., from `MailReceived` through to `SyncSucceeded`).

## Related Documents
- `architecture-overview.md`
- `event-architecture.md`
- `scalability.md`
