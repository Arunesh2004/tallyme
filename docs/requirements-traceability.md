# Requirements Traceability Matrix

| Req ID | Business Requirement | Module | Database Entity | API Endpoint | Event | Worker | Business Rule | Approval Stage | Status |
|--------|----------------------|--------|-----------------|--------------|-------|--------|---------------|----------------|--------|
| REQ-01 | Real-time Mailbox Sync | Mail Intelligence | `Mailboxes`, `Emails` | `POST /api/mail/webhooks/gmail` | `MailReceived` | Mail Worker | N/A | N/A | Documented |
| REQ-02 | Vendor Bill Upload | Vendor Bill Intelligence | `Documents` | `POST /api/documents/upload` | `DocumentUploaded` | Upload Worker | Duplicate Invoice | N/A | Documented |
| REQ-03 | AI OCR & Extraction | Document Intelligence | `BusinessDocuments`, `AIJobs` | `GET /api/documents/:id/extracted` | `BusinessDocumentCreated` | AI Worker | Confidence Below Threshold | N/A | Documented |
| REQ-04 | Tally Ledger Mapping | Accounting Intelligence | `VoucherDrafts`, `LedgerMappings` | `GET /api/documents/:id/voucher-draft` | `VoucherDraftCreated` | Accounting Worker | Ledger Missing | `NEEDS_REVIEW` | Documented |
| REQ-05 | Manual Approval Workflow | Approval Workflow | `ApprovalTasks` | `PATCH /api/approvals/tasks/:id/approve` | `ApprovalGranted` | Approval Worker | Approval Required > Amount | `APPROVED` | Documented |
| REQ-06 | Tally Prime Synchronization | Tally Sync Engine | `SyncJobs` | `GET /api/sync/jobs` | `SyncSucceeded`, `SyncFailed` | Sync Worker | Duplicate Voucher | `SYNCED` | Documented |
| REQ-07 | System Notifications | Notifications | `Notifications` | `GET /api/notifications` | `NotificationSent` | Notification Worker | N/A | N/A | Documented |
| REQ-08 | Organization Multi-Tenancy | Security | `Organizations` | `GET /api/orgs/me` | N/A | N/A | N/A | N/A | Documented |
| REQ-09 | Master Data Synchronization | Tally Sync Engine | `Vendors`, `LedgerMappings` | `POST /api/sync/masters` | `MasterSyncCompleted` | Sync Worker | Tally Master Missing | N/A | Documented |
