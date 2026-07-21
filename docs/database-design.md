# Database Architecture

## Overview
The TallyMe database employs a strict Domain-Driven organization. To ensure enterprise scalability and isolation, it utilizes a PostgreSQL-based multi-tenant strategy where every entity is segregated by an `OrganizationId` (Tenant).

## Architectural Strategies

### Multi-Tenancy & Isolation
- **Row-Level Security (RLS):** Enabled on all tables. A `current_tenant_id` context variable ensures queries inherently filter by `OrganizationId`.
- **Composite Indexes:** All highly queried tables use composite indexes starting with `OrganizationId` (e.g., `IDX_Org_Vendor`).

### Data Lifecycle
- **Primary Keys:** UUIDv7 (time-ordered UUIDs) for optimal B-Tree insertion performance.
- **Soft Delete:** Entities are never physically deleted. A `DeletedAt` timestamp is used.
- **Versioning Strategy:** The `DocumentVersions` and `ProcessingHistory` tables maintain immutable snapshots of document states before AI modification or human edits.
- **Optimistic Locking:** An `OVersion` integer is used on critical entities (`VoucherDrafts`, `ApprovalTasks`) to prevent concurrent edit overwrites.

## Core Entities

### 1. Multi-Tenant Administration
- **Organizations:** `Id`, `Name`, `GSTIN`, `SettingsJson`.
- **Users:** `Id`, `Email`, `PasswordHash`, `OrganizationId`.
- **Roles & Permissions:** RBAC mappings (`Admin`, `Accountant`, `Reviewer`).

### 2. Ingestion Domain
- **Mailboxes:** Stores encrypted OAuth tokens for IMAP/Graph syncing.
- **Emails:** Raw parsed headers, Thread IDs, mapped to `Mailboxes`.
- **Attachments / Documents:** `StorageURI`, `MimeType`, `Checksum` (for duplicate detection).

### 3. Intelligence Domain
- **BusinessDocuments:** The canonical extracted data. Contains JSONB payload of line items and GST values.
- **Vendors:** Master list of recognized vendors synced from Tally.
- **Invoices:** Specific subset data mapping back to `BusinessDocuments`.
- **AIJobs / ProcessingHistory:** Tracks OCR and LLM execution times, confidence scores, and raw model outputs for debugging.

### 4. Accounting & Approval Domain
- **VoucherDrafts:** The recommended Tally transaction (Voucher Type, Date, Debits, Credits).
- **ApprovalTasks:** Tracks state (`NEW`, `NEEDS_REVIEW`, `APPROVED`). Includes `OVersion` for locking.
- **ApprovalComments:** Threaded communication linked to a Task.
- **LedgerMappings & VoucherMappings:** Maps local IDs to Tally Master IDs.

### 5. Sync Domain
- **SyncJobs:** Tracks outbound XML pushes. `Status` (`PENDING`, `SYNCED`, `FAILED`).
- **EventOutbox / FailedEvents:** Transactional outbox pattern table ensuring reliable event publishing.
- **AuditLogs:** Immutable ledger of every state change, API call, and Sync attempt.

## Related Documents
- `api-design.md`
- `approval-workflow.md`
- `tally-sync-engine.md`
