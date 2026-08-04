# Phase 133 - Final Schema Validation (Design Verification)

## Executive Summary
This document serves as the final design verification before irreversible schema migrations are applied. Every Required Change proposed in the previous Phase 133 Schema Review has been critically analyzed for potential accounting anomalies, indexing redundancies, and backward compatibility risks.

---

## 1. The GSTIN Uniqueness Debate

**The Proposal:** Replacing `@@unique([companyId, gstin])` with `@@index([companyId, gstin])` on `VendorBranch`.

**Validation Analysis:**
- **Can multiple VendorBranch records legitimately share the same GSTIN?** Yes. 
- **Why?** Enterprise accounting often separates cost centers at the party ledger level. A school might maintain two separate Tally ledgers for the exact same supplier: "ABC Corp - Books" and "ABC Corp - Uniforms", despite both sharing the identical GSTIN.
- **What distinguishes them?** The `erpLedgerCode` and the `VendorAlias` routing rules. 
- **Alternative Modeling:** Could we use one `VendorBranch` and multiple ERP Ledger mappings (a child table)? 
  - If we did, the `VendorAlias` would have to point to the *Child Mapping* rather than the Branch. This overcomplicates the entire Matching Engine pipeline. By defining `VendorBranch` as the 1:1 representation of an ERP Ledger (as defined in Phase 130), an Alias (e.g., "ABC Books") points directly to the correct branch/ledger. 
- **Conclusion:** Downgrading the GSTIN constraint to an index is **strictly correct**. Enforcing uniqueness on GSTIN per company would block legitimate cost-center accounting scenarios and force the creation of dangerous mock-GSTINs to bypass the database constraint.

---

## 2. B-Tree Index Review

**Validation Analysis:**
The following indexes are required and confirmed to be non-redundant:
- `@@index([companyId])`: Essential for base tenant isolation on all tables.
- `@@index([vendorId])` on `VendorBranch`: Foreign key query performance.
- `@@index([vendorBranchId])` on `VendorAlias` and `VendorMatchDecision`: Foreign key query performance.
- `@@unique([invoiceCandidateId])` on `VendorMatchDecision`: Implicitly indexed. Correct.
- `@@unique([companyId, erpLedgerCode])` on `VendorBranch`: Implicitly indexed. Protects ERP sync integrity.
- `@@unique([companyId, aliasText])` on `VendorAlias`: Implicitly indexed. Protects the learning engine from duplicate rules.

There are no redundant composite indexes. Postgres will efficiently utilize the combination of single-column B-Tree indexes for complex joins.

---

## 3. Governance Fields Review

**Validation Analysis:**
Fields: `approvedBy`, `approvedAt`, `revokedBy`, `revokedAt`, `deletedAt`, `survivingBranchId`.
- **Belong in Phase A?** **Yes.** Adding these nullable fields in Phase A (Foundation) is free ($O(1)$ metadata update). If postponed to later phases, they require secondary irreversible production migrations, which carry operational risks and downtime windows. Deploying the data structure now ensures the schema is "future-proofed" for the implementation of the Audit and Learning engines in Phases C and E.

---

## 4. Backward Compatibility Verification

**Validation Analysis:**
- The existing Vendor Pipeline uses `apps/backend/src/modules/vendor-slip/domain/services/index.ts`.
- The `VendorMatcher` class strictly relies on `await this.vendorRepo.findByGSTIN(gstin)`.
- Because Phase A retains the original `gstin`, `name`, and `pan` fields on the root `Vendor` entity (and merely adds optional relations to `VendorBranch`), the Prisma Client generation will not break existing Typescript interfaces. The legacy pipeline will compile and execute perfectly, entirely ignoring the new VMMS tables until we actively switch the matching logic in Phase B.

---

## 5. Final Verdict

The proposed schema changes and corrections represent a mathematically sound, performant, and multi-tenant-safe enterprise data model.

**IMPLEMENT PHASE A**
