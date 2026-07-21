# Approval Workflow Subsystem

## Overview
The Approval Workflow subsystem governs human-in-the-loop interventions. Because AI hallucination risk is non-zero, this module ensures that TallyMe acts as an assistant rather than an autonomous proxy. It sits between `Accounting Intelligence` and the `Tally Sync Engine`.

## State Machine
The core of this module is the `ApprovalTask` state machine:
- `NEW`: Raw document ingested.
- `AI_PROCESSING`: Currently within Document or Accounting Intelligence pipelines.
- `NEEDS_REVIEW`: AI completed its draft, or a business rule failure forced a manual review.
- `APPROVED`: An accountant validated the draft.
- `EDITED`: An accountant modified the AI's recommendations.
- `REJECTED`: An accountant discarded the document (e.g., duplicate, invalid).
- `QUEUED_FOR_SYNC`: Awaiting pickup by the Sync Worker.
- `SYNCED`: Successfully pushed to Tally Prime.
- `VERIFIED`: Post-sync reconciliation successful.
- `ARCHIVED`: Final terminal state.

### Forbidden Transitions
- `APPROVED` -> `NEEDS_REVIEW` (Must go to `EDITED` or `QUEUED_FOR_SYNC`).
- `SYNCED` -> `REJECTED` (Once in Tally, it must be canceled in Tally, triggering a sync update, not a local state deletion).

## Review Capabilities
- **Role-Based Access Control (RBAC):** Junior accountants can Edit/Review, but Senior Accountants (Admin) are required to transition `NEEDS_REVIEW` to `APPROVED` for vouchers exceeding a dynamic policy threshold.
- **Bulk Operations:** Users can select multiple tasks in `NEEDS_REVIEW` to Bulk Approve or Bulk Reject.
- **Comments & Collaboration:** Support for threaded internal comments on any `ApprovalTask`.

## Audit Trail & Versioning
- Every transition creates an immutable record in the `AuditLog`.
- When a user edits a `VoucherDraft`, the previous state is preserved in a `ChangeHistory` table. This is critical for measuring AI accuracy (comparing AI output vs. Final Human output).

## Notification Events
Transitions to `NEEDS_REVIEW` (especially those caused by Escalation rules or high-value vouchers) publish `ApprovalRequested` events, consumed by the Notification Worker to alert accountants via UI toasts or email digests.
