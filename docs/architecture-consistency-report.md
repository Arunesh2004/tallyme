# Architecture Consistency Report

## 1. Terminology Consistency
All 15 architecture documents have been reviewed for strict naming consistency.
- **`BusinessDocument`**: Extracted data containing NO accounting recommendations.
- **`VoucherDraft`**: The proposed double-entry transaction mapped to Tally.
- **`ApprovalTask`**: The human-in-the-loop state wrapper around a `VoucherDraft`.
- **`SyncJob` / `AIJob`**: Background asynchronous task entities.
- **`Organization`**: Replaces the term "Tenant" in database schemas, though "Tenant" is used conceptually in multi-tenancy documentation.

## 2. Responsibility Boundaries
The architecture successfully enforces zero duplication of business logic:
- **Mail/Upload:** Acquires pixels/binaries.
- **Document Intelligence:** Extracts facts from pixels (`BusinessDocument`).
- **Accounting Intelligence:** Applies rules to facts (`VoucherDraft`).
- **Sync Engine:** Transmits approved drafts (XML) to Tally Prime.

## 3. Event Consistency
Event nomenclature aligns strictly with past-tense domain actions (e.g., `DocumentUploaded`, `BusinessDocumentCreated`, `VoucherQueuedForSync`). There are no missing event bridges between the decoupled modules. The Outbox Pattern ensures events are never published unless the database transaction commits successfully.

## 4. Entity Consistency
Every API endpoint specified in `api-design.md` maps directly to an entity defined in `database-design.md`. The Background Workers accurately consume the events defined in `event-architecture.md` and mutate the documented state machines.

## 5. Lifecycle Consistency
The `ApprovalTask` state machine (`NEW` -> `NEEDS_REVIEW` -> `APPROVED` -> `SYNCED`) is perfectly consistent across `approval-workflow.md`, `accounting-intelligence.md`, and the `tally-sync-engine.md`.

## 6. Risk Assessment
- **Single Points of Failure:** The Tally Prime on-premise installation. If Tally is offline, the Sync Engine will back up. Mitigated by durable Sync Queues and DLQ routing.
- **Scaling Concerns:** LLM API rate limiting during high-volume ingestion (10,000 invoices). Mitigated by queue-depth-based worker auto-scaling and strict concurrency caps.
- **AI Confidence Risks:** Hallucinations causing incorrect ledger mappings. Mitigated by strict Math Checksums in Document Intelligence and fallback to `NEEDS_REVIEW` in Accounting Intelligence.

## 7. Recommendations for Implementation
1. **Develop the Sync Engine First (Mocked):** Before integrating AI, ensure the API can successfully write and read complex XML from a sandbox Tally instance to validate the `school-accounting-domain.md` assumptions.
2. **Implement Tracing Day 1:** Because the architecture is highly asynchronous, implementing OpenTelemetry `TraceId` passing across the Event Bus from day one is critical for debugging the pipeline.
