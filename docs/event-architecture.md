# Event-Driven Architecture

## Overview
TallyMe relies on an asynchronous, event-driven communication backbone to decouple domains. This ensures that failures in the `Tally Sync Engine` do not crash the `Mail Intelligence` ingestion pipeline.

## Event Standards
- **Naming Convention:** `[Domain][Action][PastTense]` (e.g., `DocumentUploaded`, `VoucherSynced`).
- **Payload Schema:** All events enforce a standard wrapper containing `EventId`, `CorrelationId`, `TraceId`, `TenantId`, `Timestamp`, and `Data` (Domain-specific JSON).
- **Idempotency:** Subscribers must handle duplicate deliveries. Operations use `EventId` or `Idempotency-Key` to safely ignore replays.
- **Outbox Pattern:** To prevent dual-write inconsistencies, all events are initially written to the `EventOutbox` table in the same transaction as the domain entity update. A background publisher polls and dispatches them to the broker (e.g., RabbitMQ/Kafka).

## Core Events

### 1. Ingestion Events
- **`MailReceived`**
  - **Publisher:** Mail Intelligence (Webhook/Polling)
  - **Subscriber:** Mail Worker (Parsing)
  - **Failure:** Exponential backoff.

- **`DocumentUploaded`**
  - **Publisher:** Vendor Bill Intelligence / Mail Intelligence
  - **Subscriber:** Document Intelligence (AI Worker)
  - **Payload:** `DocumentId`, `StorageURI`

### 2. Intelligence Events
- **`BusinessDocumentCreated`**
  - **Publisher:** Document Intelligence
  - **Subscriber:** Accounting Intelligence (Voucher drafting)
  - **Payload:** `BusinessDocumentId`

- **`VoucherDraftCreated`**
  - **Publisher:** Accounting Intelligence
  - **Subscriber:** Approval Workflow (Notification generation)

### 3. Approval & Sync Events
- **`ApprovalRequested`**
  - **Publisher:** Approval Workflow
  - **Subscriber:** Notification Worker (Email/UI Alerts)

- **`ApprovalGranted`**
  - **Publisher:** Approval Workflow
  - **Subscriber:** None (Direct state transition to `QUEUED_FOR_SYNC`)

- **`VoucherQueuedForSync`**
  - **Publisher:** Approval Workflow
  - **Subscriber:** Tally Sync Engine (Sync Worker)
  - **Ordering Guarantee:** Strict FIFO per `TenantId` to prevent ledger dependency errors in Tally.

- **`SyncFailed`**
  - **Publisher:** Tally Sync Engine
  - **Subscriber:** Notification Worker / Retry Worker
  - **Dead Letter Queue (DLQ):** Moves to DLQ after 5 consecutive transient failures or 1 persistent validation error.

## Monitoring & Replay
- Every published and consumed event is recorded.
- In the event of a catastrophic failure in a downstream module (e.g., AI pipeline bug), events can be isolated by `CorrelationId` and replayed using the `EventOutbox` history.

## Related Documents
- `database-design.md`
- `background-workers.md`
- `architecture-overview.md`
