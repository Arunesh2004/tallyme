# Phase 133 - Schema Review (Production Readiness)

## Executive Summary
This document provides the final, critical review of the proposed Phase A Schema Implementation Plan. Evaluating the schema against the approved VMMS architectures (Phase 129-132) reveals that while the core entities and backward compatibility strategies are excellent, there are critical omissions in indexing, governance fields, and a fatal uniqueness constraint that would break enterprise accounting workflows.

**Final Verdict:** `APPROVED WITH REQUIRED CHANGES`

---

## PART 1: SCHEMA CONSISTENCY

### `Vendor`
- **Missing Fields:** `legalName String?` (Defined in Phase 130, missing in plan). `deletedAt DateTime?` (Essential for soft deletes).
- **Correctness:** Adding `status VendorStatus @default(ACTIVE)` is correct and preserves backward compatibility.

### `VendorBranch`
- **Missing Fields:** `survivingBranchId String?` (Required for Phase 131 merge handling). `deletedAt DateTime?`.
- **Correctness:** `address` as `Json?` is correct.

### `VendorAlias`
- **Missing Fields:** `approvedBy String?`, `approvedAt DateTime?`, `revokedBy String?`, `revokedAt DateTime?`. (Mandated by Phase 132 Alias Governance).
- **Correctness:** Merging learning fields (`successfulUses`, `maturityScore`) directly into the alias table is correct and avoids join overhead.

### `VendorMatchDecision`
- **Correctness:** Consolidating evidence into `matchEvidence Json` (Postgres `JSONB`) perfectly solves the 35-million-row storage explosion highlighted in Phase 131.

### `VendorAudit`
- **Correctness:** Append-only log with `oldPayload` and `newPayload` JSON satisfies the immutable event-sourcing requirement.

---

## PART 2: INDEX REVIEW

- **Missing Indexes:** The plan completely omitted non-unique B-Tree indexes. At 5 million invoices, lacking indexes on foreign keys (`vendorBranchId`, `invoiceCandidateId`) will cause catastrophic Seq Scans. 
  - Required: `@@index([companyId])`, `@@index([vendorId])`, `@@index([vendorBranchId])` on all applicable tables.
- **pg_trgm Index:** This MUST be postponed until Phase B. `pg_trgm` requires executing a raw SQL migration (`CREATE EXTENSION pg_trgm`), which is outside the scope of Phase A's purely structural Prisma deployment.

---

## PART 3: CONSTRAINT REVIEW

**Fatal Constraint Discovered:**
- `@@unique([companyId, gstin])` on `VendorBranch`.
- *Why it's fatal:* In enterprise ERPs, a single company often creates multiple ledgers for the exact same supplier GSTIN (e.g., "Shree Traders - Hardware" and "Shree Traders - Services" for distinct cost center tracking). 
- *Fix:* This unique constraint MUST be downgraded to a standard index `@@index([companyId, gstin])`.

**Correct Constraints:**
- `@@unique([companyId, erpLedgerCode])` on `VendorBranch` is mathematically correct. ERP ledger codes must be strictly unique per tenant.
- `@@unique([companyId, aliasText])` on `VendorAlias` safely prevents parallel workers from duplicating learning rules.

---

## PART 4: MIGRATION SAFETY

Assuming 100k vendors and 5 million invoices:
- **Default Value Risk:** Adding `status VendorStatus @default(ACTIVE)` to the existing 100k-row `Vendor` table is $O(1)$ fast in Postgres 11+, as it only updates metadata rather than rewriting the table. 
- **Locking Risks:** Creating new tables (`VendorBranch`, `VendorAlias`, etc.) does not lock existing tables. 
- **Backfill:** Zero backfill is required because all new relations (e.g., `VendorMatchDecision` to `InvoiceCandidate`) are entirely optional. The migration will be sub-second and zero-downtime.

---

## PART 5: BACKWARD COMPATIBILITY

The existing Vendor Pipeline will **continue working exactly as before**.
- `VendorSlipWorker` queries `Vendor` via `findByGSTIN(gstin)`. Because the legacy `gstin`, `name`, and `pan` fields remain entirely untouched on the `Vendor` model, the old logic will not break.
- No existing Typescript interfaces or Prisma includes will fail because no existing fields were deleted or renamed.

---

## PART 6: MISSING PRODUCTION FIELDS

The following governance fields must be added to support Phase 132 MDM standards:
- **`VendorAlias`:** 
  - `approvedBy`, `approvedAt`: Critical for RBAC. The system needs to know which Admin approved a pending alias.
  - `revokedBy`, `revokedAt`: Critical for auditing who punished/revoked bad learning.
- **`VendorBranch` / `Vendor`:**
  - `deletedAt`: Must exist now to support Soft Deletes (INACTIVE lifecycle).
- **`VendorAudit`:**
  - `createdBy`: Already proposed. Correct.

---

## PART 7: FUTURE PHASE COMPATIBILITY

This schema natively supports all future phases:
- **Replay Engine:** Supported because `VendorMatchDecision` decoupled the Evidence into an immutable JSON snapshot.
- **Learning Engine:** Supported natively via `VendorAlias.maturityScore` and `successfulUses`.
- **Fuzzy Matcher:** Supported in Phase B once the Trigram index is manually applied to `VendorBranch.branchName`.

---

## PART 8: FINAL APPROVAL

**Verdict:** `APPROVED WITH REQUIRED CHANGES`

### Required Changes (Ranked by Severity)

1. **CRITICAL:** Remove `@@unique([companyId, gstin])` from `VendorBranch` and replace it with `@@index([companyId, gstin])` to allow multi-ledger mapping for a single GSTIN.
2. **HIGH:** Add explicit B-Tree indexes (`@@index([companyId])`, `@@index([vendorBranchId])`, etc.) to all new tables to prevent query bottlenecks.
3. **HIGH:** Add `approvedBy String?`, `approvedAt DateTime?`, `revokedBy String?`, `revokedAt DateTime?` to the `VendorAlias` model for strict MDM governance.
4. **MEDIUM:** Add `deletedAt DateTime?` to `Vendor` and `VendorBranch`.
5. **MEDIUM:** Add `survivingBranchId String?` to `VendorBranch` to support future branch mergers.
6. **LOW:** Ensure `pg_trgm` fuzzy indexing is explicitly excluded from Phase A implementation.

**Next Step:** Implement Phase A directly applying these required changes. No further architecture review is needed.
