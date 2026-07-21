# API Design Architecture

## Overview
The TallyMe platform exposes RESTful APIs grouped by bounded context. To ensure consistency, predictability, and security, all endpoints adhere to standardized error formats, pagination schemes, and Idempotency protocols.

## Standardization & Conventions
- **Authentication:** Bearer token (JWT) passed in the `Authorization` header.
- **Error Format:** `{ "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [] } }`
- **Pagination:** Cursor-based (`?cursor=xyz&limit=50`) preferred over offset-based for performance on large document tables.
- **Idempotency:** All `POST`, `PUT`, and `PATCH` requests accept an `Idempotency-Key` header.
- **Rate Limiting:** IP-based and Tenant-based rate limits enforced via Redis token bucket.

## API Groupings

### 1. Authentication
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### 2. Organizations & Users
- `GET /api/orgs/me`
- `GET /api/users` (List users within tenant)
- `POST /api/users` (Invite user)

### 3. Mail & Vendor Bills (Ingestion)
- `POST /api/mail/webhooks/gmail` (Push events from Google)
- `POST /api/documents/upload` 
  - **Purpose:** Manual ingestion. Accepts `multipart/form-data`. Returns `DocumentId`.

### 4. Document & Accounting Intelligence
*Note: AI processes are asynchronous. These endpoints fetch results.*
- `GET /api/documents/:id/extracted` (Returns JSONB of `BusinessDocument`)
- `GET /api/documents/:id/voucher-draft` (Returns recommended `VoucherDraft`)
- `POST /api/documents/:id/reprocess` (Forces an `AIJob` retry)

### 5. Approval Workflow
- `GET /api/approvals/tasks?status=NEEDS_REVIEW`
- `PATCH /api/approvals/tasks/:id/approve`
- `PATCH /api/approvals/tasks/:id/reject`
- `POST /api/approvals/tasks/bulk-approve`
  - **Request:** Array of Task IDs.
  - **Response:** Job ID for async bulk processing.

### 6. Synchronization & Tally Prime
- `GET /api/sync/jobs` (Monitor outbound Tally XML pushes)
- `POST /api/sync/retry/:id`
- `POST /api/sync/masters` (Force pull ledgers from Tally)

### 7. Settings & Business Rules
- `GET /api/settings/rules`
- `PATCH /api/settings/rules/:id` (Configure confidence thresholds)

## Related Documents
- `database-design.md`
- `event-architecture.md`
- `approval-workflow.md`
