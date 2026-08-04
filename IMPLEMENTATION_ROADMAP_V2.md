# Implementation Roadmap V2.0 (VMMS Production)

This roadmap breaks the VMMS implementation into strictly isolated, backward-compatible, production-safe phases. Proceeding to a subsequent phase requires explicit compilation and integration test passes.

## Phase A: Foundation (Data Model)
**Purpose:** Deploy the new schema architecture without touching active business logic.
**Files Modified:** `schema.prisma`
**Schema Changes:** Add `VendorStatus`, `AliasStatus`, `VendorBranch`, `VendorLedger`, `VendorAlias`, `VendorMatchDecision`, `VendorAudit`. Legacy `Vendor` fields (`gstin`, `name`) are kept intact.
**Migration Risk:** Zero (Additive only).
**Rollback Strategy:** Revert Prisma schema, drop new tables via SQL.
**Expected Completion Criteria:** `npx prisma generate` succeeds, application compiles, existing E2E Vendor slip pipeline runs identically.

## Phase B: Dual-Write & Core Matcher
**Purpose:** Begin writing data to the new structures while continuing to support the old matching engine as a fallback. Implement Stage 1 and Stage 2 GSTIN matching on the new `VendorBranch` entity.
**Files Modified:** `vendor-slip.worker.ts`, `vendor-matcher.service.ts`, `vendor.repository.ts`.
**Migration Risk:** Low. Old logic remains the default if new logic yields zero results.
**Rollback Strategy:** Feature flag toggle `USE_VMMS_MATCHER=false`.
**Expected Completion Criteria:** Unit tests pass for Exact & Normalized GSTIN matching. DB contains populated `VendorMatchDecision` records for test invoices.

## Phase C: Ledger Selection & Alias Routing
**Purpose:** Introduce `VendorLedger` mapping and point `VendorAlias` resolution directly to ledgers.
**Files Modified:** `ledger-mapper.service.ts`, `expense-allocator.service.ts`.
**Migration Risk:** Medium (Alters accounting logic).
**Rollback Strategy:** Revert service container binding to legacy LedgerMapper.
**Expected Completion Criteria:** The system successfully routes an invoice to an ERP ledger based on an Alias, bypassing GSTIN lookup entirely.

## Phase D: Fuzzy Matching & `pg_trgm`
**Purpose:** Deploy the Trigram index to production and implement Stage 6 Name Similarity matching.
**Files Modified:** Database raw SQL migration, `vendor-matcher.service.ts`.
**Migration Risk:** High (Database index lock on large `VendorBranch` table).
**Rollback Strategy:** Concurrent index creation (`CREATE INDEX CONCURRENTLY`) minimizes locking. Drop index if CPU spikes.
**Expected Completion Criteria:** Similarity search $O(\log N)$ performance validated. Delta > 10 rule enforced in code.

## Phase E: The Learning Engine & Governance
**Purpose:** Automate the maturation of Aliases based on manual overrides and track historical audits.
**Files Modified:** `manual-review.controller.ts`, `learning-engine.service.ts`.
**Migration Risk:** Low (Purely new feature).
**Rollback Strategy:** Standard git revert.
**Expected Completion Criteria:** A pending alias successfully promotes to `AUTOMATED` after crossing the `successfulUses` threshold.

## Phase F: Sunset Legacy Architecture
**Purpose:** Fully commit to VMMS. Remove `gstin`, `name`, and `pan` from the root `Vendor` table.
**Files Modified:** `schema.prisma`, all legacy DTOs.
**Migration Risk:** Critical. This is the irreversible break. Requires a massive data migration script converting old `Vendor` flat rows into `Vendor`, `VendorBranch`, and `VendorLedger` relational structures.
**Rollback Strategy:** Full database restoration from snapshot.
**Expected Completion Criteria:** Clean schema. Zero technical debt. All unit tests green.
