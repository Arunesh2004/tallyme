# TallyMe Enterprise — Database Schema Guide

## Overview
Managed by Prisma ORM. Schema: `apps/backend/prisma/schema.prisma`. Database: PostgreSQL 15.

---

## Core Auth Tables

### `User`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Auto-generated |
| email | String UNIQUE | Login credential |
| passwordHash | String | bcrypt hash |
| isActive | Boolean | Default true |
| roleId | FK → Role | RBAC role |

### `Role`
Values: `Admin`, `Accountant`, `Operator`

### `Session`
Stores refresh tokens with expiry. Cascade-deletes on User deletion.

---

## Vendor Pipeline Tables

### `Document`
Central tracking entity for uploaded invoice files.
- `status`: Enum (`UPLOADED` → `OCR_PROCESSING` → `EXTRACTION_PROCESSING` → `VENDOR_MATCHING` → `MANUAL_REVIEW` | `VOUCHER_GENERATED` → `ERP_SYNCING` → `COMPLETED`)

### `InvoiceCandidate`
1:1 with `Document`. Stores AI-extracted invoice fields (number, date, GSTIN, amounts).

### `VendorMatch`
1:1 with `Document`. Links to matched `Vendor` with confidence score.

### `ExpenseAllocation` + `ExpenseAllocationLine`
Stores ledger-level allocation of the invoice total.

### `ManualReviewRoute`
Created when confidence is below threshold. Tracks resolution.

### `VendorSlipAudit`
Append-only audit trail for all actions on a Document.

---

## Student Pipeline Tables

### `Student`
Master entity. Key fields: `enrollmentNo` (UNIQUE), `admissionNumber`, `class`, `section`, `academicYear`.

### `EmailDocument`
Equivalent of `Document` for student payment emails.
- `status`: Enum (`RECEIVED` → `EXTRACTION_PROCESSING` → `STUDENT_MATCHING` → `FEE_ALLOCATING` → `VOUCHER_GENERATED` → `COMPLETED`)

### `StudentPaymentCandidate`
Extracted payment data (gateway ID, UTR, amount, payer details).

### `StudentMatchResult`
Confidence-scored link between `EmailDocument` and `Student`.

### `StudentFeeAllocation` + `StudentFeeAllocationLine`
Allocation of payment across outstanding fee items.

---

## Shared Voucher Tables

### `VoucherCandidate`
Central voucher entity. Both Vendor and Student pipelines produce `VoucherCandidate` records.
- `voucherType`: Enum (`Receipt` | `Payment` | `Journal` | `Purchase` | `Sales` | `Contra`)
- `status`: Enum (`PENDING` | `PROCESSING` | `COMPLETED` | `FAILED`)

### `VoucherCandidateEntry`
Double-entry bookkeeping lines. Each `VoucherCandidate` has at least 2 entries (debit + credit).

### `FeeAllocationCandidate` / `ExpenseAllocationCandidate`
Domain-specific join records linking allocations back to their VoucherCandidate.

---

## ERP Sync Tables

### `ERPSyncJob`
State machine for Tally sync. Key fields:
- `idempotencyHash`: Prevents duplicate voucher creation
- `maxAttempts`: Default 5
- `erpReferenceId`: Tally's returned `LASTVCHID`
- `status`: 9-state enum (`PENDING` → `SYNCING` → `SYNCED` | `FAILED_PERMANENT`)

### `ERPSyncAttempt`
Immutable log of each HTTP round-trip to Tally (hash, duration, success flag).

### `ERPSyncHistory`
State transition log for `ERPSyncJob`.

### `MigrationHistory`
Log of all Tally master creation operations (ledgers, groups, cost centres).

---

## Configuration Table

### `SchoolConfiguration`
Singleton-pattern table (enforced by application logic). Stores runtime-configurable thresholds.

---

## Indexes & Constraints
- All FKs use cascade deletes to prevent orphan records
- `ERPSyncJob.idempotencyHash`: UNIQUE — prevents double-processing
- `VoucherCandidate.voucherNumber`: UNIQUE — prevents duplicate vouchers
- `EmailDocument.messageId`: UNIQUE — prevents reprocessing same email
- `Document.checksum`: Used for duplicate detection at upload time

---

## Migration History
```bash
# View applied migrations
npx prisma migrate status

# Migrations are stored in: apps/backend/prisma/migrations/
```
