# TallyMe Enterprise — Administrator Guide

## Overview
The Operations Portal provides full visibility into TallyMe Enterprise's processing pipelines. Administrators have access to all screens.

---

## Dashboard (`/dashboard`)

Displays system-wide KPIs sourced from `GET /dashboard/overview`:
- **Vendor Invoices Processed**: Total documents that completed the full pipeline
- **Student Payments Processed**: Total email payments that reached ERP sync
- **Voucher Count**: Total `VoucherCandidate` records in `COMPLETED` state
- **ERP Sync Status**: Live count of `ERPSyncJob` states (PENDING / SYNCING / SYNCED / FAILED)
- **Pending Reviews**: Count of `ManualReviewRoute` and `StudentManualReviewRoute` in PENDING state
- **Failed Jobs**: `ERPSyncJob` in `FAILED_PERMANENT` state

> All values are real-time from the database. If the API is unreachable, the dashboard displays **UNVERIFIED**.

---

## Vendor Review Queue (`/vendor-review`)

Lists all `InvoiceCandidate` records in `MANUAL_REVIEW_REQUIRED` status.

**Actions:**
- **Approve**: Promotes the document to `APPROVED` status and enqueues an ERP sync job
- **Reject**: Marks as `FAILED` and creates an audit entry

**Columns:** Invoice Number, Vendor Name, Amount, Confidence Score, Extraction Date, Status

---

## Student Review Queue (`/student-review`)

Lists `StudentPaymentCandidate` records where `manualReviewRequired = true`.

**Actions:**
- **Approve Match**: Confirms the student match and proceeds to fee allocation
- **Override Match**: Allows selecting the correct student from the database

---

## ERP Monitoring (`/erp-monitoring`)

Displays `ERPSyncJob` state machine with:
- Current status per voucher
- Attempt count vs. `maxAttempts` (default: 5)
- Last error message
- XML payload viewer (read-only)
- Retry trigger (ADMIN only)

---

## Tally Migration Center (`/tally-migration`)

Displays `MigrationHistory` records. Requires Accountant approval before rollback.

> ⚠️ **Warning**: Rollback requires accountant verification. Incorrect rollbacks may corrupt Tally data.

---

## Audit Center (`/audit`)

Unified timeline from `VendorSlipAudit` and `StudentPaymentAudit` tables. Filter by:
- Module (Vendor / Student / ERP)
- Actor (user or system)
- Date range

---

## System Health (`/system-health`)

Displays live status from `GET /system/health` and `GET /system/capabilities`:

| Service | Endpoint Tested | Classification |
|---|---|---|
| PostgreSQL | `SELECT 1` | VERIFIED if online |
| Redis | `PING` | VERIFIED if online |
| BullMQ | Queue registration | VERIFIED if online |
| Tally Prime | TCP to `TALLY_HOST:TALLY_PORT` | UNVERIFIED if not configured |
| Azure OCR | Presence of `AZURE_OCR_KEY` | UNVERIFIED if not configured |
| Gemini AI | Presence of `GEMINI_API_KEY` | UNVERIFIED if not configured |
| Gmail | Presence of OAuth credentials | UNVERIFIED if not configured |

---

## Configuration Panel (`/configuration`)

Managed by ADMIN role only. Editable via `PUT /admin/config`:
- OCR confidence threshold (default: 0.7)
- Student matching confidence threshold (default: 0.8)
- ERP retry max attempts (default: 5)
- Processing timeout limits

> API keys and secrets are never displayed in this panel. Modify them via server environment variables only.

---

## User Management

Users are managed directly in the PostgreSQL `User` table with roles from the `Role` table:
- `Admin` — Full system access
- `Accountant` — Review queues, migration approval
- `Operator` — Read-only dashboard and monitoring

Passwords are stored as bcrypt hashes in the `passwordHash` field.
